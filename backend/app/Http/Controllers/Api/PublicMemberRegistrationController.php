<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PublicMemberRegistrationRequest;
use App\Models\Member;
use App\Models\Organisation;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\MemberSepaSubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PublicMemberRegistrationController extends Controller
{
    public function __construct(
        private readonly MemberSepaSubscriptionService $sepaService
    ) {
    }

    public function store(PublicMemberRegistrationRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Bepaal organisatie
        $organisation = $this->resolveOrganisation($request);

        if (! $organisation) {
            return response()->json([
                'message' => 'Organisatie niet gevonden. Neem contact op met de beheerder.',
            ], 404);
        }

        try {
            return DB::transaction(function () use ($validated, $organisation) {
                // Maak lid aan
                $member = Member::create([
                    'organisation_id' => $organisation->id,
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'gender' => $validated['gender'],
                    'birth_date' => $validated['birth_date'] ?? null,
                    'email' => $validated['email'],
                    'street_address' => $validated['street_address'],
                    'postal_code' => $validated['postal_code'],
                    'city' => $validated['city'],
                    'iban' => str_replace(' ', '', strtoupper($validated['iban'])),
                    'contribution_amount' => (float) $validated['contribution_amount'],
                    'contribution_frequency' => 'monthly',
                    'contribution_start_date' => $validated['contribution_start_date'],
                    'contribution_note' => $validated['contribution_note'] ?? null,
                    'status' => 'active',
                ]);

                // Setup SEPA abonnement als akkoord gegeven
                if ($validated['sepa_consent'] ?? false) {
                    try {
                        // Gebruik ingelogde gebruiker als actor, anders zoek een org_admin
                        $adminUser = $request->user();
                        
                        if (! $adminUser || ! $adminUser->hasRole('org_admin') || $adminUser->organisation_id !== $organisation->id) {
                            // Zoek een org_admin user voor deze organisatie om als actor te gebruiken
                            $adminUser = User::where('organisation_id', $organisation->id)
                                ->whereHas('roles', function ($query) {
                                    $query->where('name', 'org_admin');
                                })
                                ->where('status', 'active')
                                ->first();
                        }

                        if ($adminUser) {
                            $this->sepaService->setupSepaSubscription(
                                $adminUser,
                                $member,
                                (float) $validated['contribution_amount'],
                                $member->iban,
                                "Maandelijkse contributie voor {$member->full_name}",
                                $validated['contribution_note'] ?? null
                            );
                        } else {
                            Log::warning("Geen actieve org_admin gevonden voor organisatie {$organisation->id} om SEPA abonnement in te stellen voor lid {$member->id}");
                        }
                    } catch (\Exception $e) {
                        // Log error maar laat lid aanmaken slagen
                        Log::error("SEPA abonnement setup mislukt voor lid {$member->id}: " . $e->getMessage(), [
                            'member_id' => $member->id,
                            'organisation_id' => $organisation->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                return response()->json([
                    'message' => 'Aanmelding succesvol ontvangen.',
                    'data' => [
                        'id' => $member->id,
                        'name' => $member->full_name,
                    ],
                ], 201);
            });
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validatiefout',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Fout bij publieke lid registratie: ' . $e->getMessage(), [
                'organisation_id' => $organisation->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Er is een fout opgetreden bij het verwerken van uw aanmelding. Probeer het later opnieuw of neem contact op met de beheerder.',
            ], 500);
        }
    }

    private function resolveOrganisation(PublicMemberRegistrationRequest $request): ?Organisation
    {
        // Prioriteit 1: URL parameter org_id (expliciet meegegeven)
        if ($request->has('org_id') && $request->filled('org_id')) {
            $orgId = (int) $request->input('org_id');
            $organisation = Organisation::find($orgId);

            if ($organisation) {
                return $organisation;
            }
        }

        // Prioriteit 2: Subdomein extractie (voor publieke aanmeldpagina's)
        $subdomain = $this->extractSubdomain($request);
        if ($subdomain) {
            $organisation = Organisation::where('subdomain', $subdomain)->first();
            if ($organisation) {
                return $organisation;
            }
        }

        // Prioriteit 3: Ingelogde admin gebruiker (als backup context)
        $user = $request->user();
        if ($user && $user->organisation_id && $user->hasRole('org_admin')) {
            $organisation = Organisation::find($user->organisation_id);
            if ($organisation) {
                return $organisation;
            }
        }

        // Prioriteit 4: Platform setting voor subdomain mapping (toekomstig)
        // Voor nu gebruiken we alleen de fallback

        // Fallback: Platform setting voor single org (als default)
        $orgId = PlatformSetting::get('public_registration_organisation_id');

        if ($orgId) {
            $orgId = (int) $orgId;
            return Organisation::find($orgId);
        }

        return null;
    }

    /**
     * Extraheert subdomein uit request headers.
     */
    private function extractSubdomain(PublicMemberRegistrationRequest $request): ?string
    {
        // Prioriteit 1: Custom header
        $subdomainHeader = $request->header('X-Organisation-Subdomain');
        if ($subdomainHeader) {
            return $this->normalizeSubdomain($subdomainHeader);
        }

        // Prioriteit 2: Origin header
        $origin = $request->header('Origin');
        if ($origin) {
            $subdomain = $this->extractSubdomainFromUrl($origin);
            if ($subdomain) {
                return $subdomain;
            }
        }

        // Prioriteit 3: Referer header
        $referer = $request->header('Referer');
        if ($referer) {
            $subdomain = $this->extractSubdomainFromUrl($referer);
            if ($subdomain) {
                return $subdomain;
            }
        }

        // Prioriteit 4: Host header
        $host = $request->header('Host');
        if ($host) {
            $subdomain = $this->extractSubdomainFromHost($host);
            if ($subdomain) {
                return $subdomain;
            }
        }

        return null;
    }

    /**
     * Extraheert subdomein uit URL (Origin/Referer).
     */
    private function extractSubdomainFromUrl(string $url): ?string
    {
        try {
            $parsed = parse_url($url);
            if (! isset($parsed['host'])) {
                return null;
            }

            return $this->extractSubdomainFromHost($parsed['host']);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Extraheert subdomein uit hostname.
     */
    private function extractSubdomainFromHost(string $host): ?string
    {
        // Verwijder poort als aanwezig
        $host = explode(':', $host)[0];

        // Check voor .aidatim.nl
        if (! str_ends_with($host, '.aidatim.nl')) {
            return null;
        }

        // Extract subdomein (alles voor .aidatim.nl)
        $parts = explode('.', $host);
        
        // Voor subdomeinen zoals 'isn-gorinchem-suleyman-celebi.aidatim.nl'
        // parts[0] is 'isn-gorinchem-suleyman-celebi'
        if (count($parts) >= 3) {
            // Neem het eerste deel als subdomein (alles voor de eerste punt)
            // Maar wacht, als het subdomein zelf punten bevat (wat niet gebruikelijk is, maar technisch kan), 
            // dan klopt dit niet helemaal.
            // Echter, standaard setup is <subdomain>.aidatim.nl
            
            // We nemen alles wat voor .aidatim.nl staat
            // Dit is veiliger dan expliciet parts[0] nemen als we complexere structuren zouden hebben
            $baseDomain = '.aidatim.nl';
            $subdomain = substr($host, 0, -strlen($baseDomain));
            
            return $this->normalizeSubdomain($subdomain);
        }

        return null;
    }

    /**
     * Normaliseert subdomein (lowercase, trim).
     */
    private function normalizeSubdomain(string $subdomain): string
    {
        return strtolower(trim($subdomain));
    }
}

