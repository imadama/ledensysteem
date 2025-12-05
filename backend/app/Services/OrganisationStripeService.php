<?php

namespace App\Services;

use App\Models\Organisation;
use App\Models\OrganisationStripeConnection;
use Stripe\Account;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class OrganisationStripeService
{
    public function __construct(private readonly StripeClient $stripe)
    {
    }

    public function getConnectionForOrganisation(Organisation $organisation): OrganisationStripeConnection
    {
        return $organisation->stripeConnection()->firstOrCreate([], [
            'status' => 'none',
        ]);
    }

    /**
     * @return array{connection: OrganisationStripeConnection, url: string}
     */
    public function createOnboardingLink(Organisation $organisation): array
    {
        $connection = $this->getConnectionForOrganisation($organisation);

        try {
            if (! $connection->stripe_account_id) {
                $account = $this->createStripeAccount($organisation);

                $connection->fill([
                    'stripe_account_id' => $account->id,
                    'status' => 'pending',
                    'last_error' => null,
                ]);
                $connection->save();
            } else {
                // Refresh status voordat we een link proberen aan te maken
                $account = $this->stripe->accounts->retrieve($connection->stripe_account_id, []);
                $this->refreshStatusFromAccount($connection, $account);
                $connection->save();
                
                // Als account geblokkeerd is, gooi een exception met duidelijke melding
                if ($connection->status === 'blocked') {
                    throw new ApiErrorException(
                        $connection->last_error ?? 'Stripe account is geblokkeerd. Neem contact op met Stripe support.'
                    );
                }
            }

            $link = $this->stripe->accountLinks->create([
                'account' => $connection->stripe_account_id,
                'type' => 'account_onboarding',
                'refresh_url' => $this->buildFrontendUrl('/organisation/settings/payments?onboarding=retry'),
                'return_url' => $this->buildFrontendUrl('/organisation/settings/payments?onboarding=return'),
            ]);
        } catch (ApiErrorException $exception) {
            $connection->last_error = $exception->getMessage();
            $connection->save();

            throw $exception;
        }

        return [
            'connection' => $connection->fresh(),
            'url' => $link->url,
        ];
    }

    public function refreshConnection(Organisation $organisation): OrganisationStripeConnection
    {
        $connection = $this->getConnectionForOrganisation($organisation);

        if (! $connection->stripe_account_id) {
            return $connection;
        }

        try {
            $account = $this->stripe->accounts->retrieve($connection->stripe_account_id, []);
            $this->refreshStatusFromAccount($connection, $account);
            $connection->save();
        } catch (ApiErrorException $exception) {
            $connection->last_error = $exception->getMessage();
            $connection->save();

            throw $exception;
        }

        return $connection->fresh();
    }

    public function syncConnectionByAccountId(string $accountId): ?OrganisationStripeConnection
    {
        $connection = OrganisationStripeConnection::query()
            ->where('stripe_account_id', $accountId)
            ->first();

        if (! $connection) {
            return null;
        }

        try {
            $account = $this->stripe->accounts->retrieve($accountId, []);
            $this->refreshStatusFromAccount($connection, $account);
            $connection->save();
        } catch (ApiErrorException $exception) {
            $connection->last_error = $exception->getMessage();
            $connection->save();

            throw $exception;
        }

        return $connection->fresh();
    }

    /**
     * @return array{url: string}
     */
    public function createDashboardLoginLink(Organisation $organisation): array
    {
        $connection = $this->getConnectionForOrganisation($organisation);

        if (! $connection->stripe_account_id) {
            throw new \RuntimeException('Stripe account is not connected yet.');
        }

        try {
            $loginLink = $this->stripe->accounts->createLoginLink($connection->stripe_account_id);
        } catch (ApiErrorException $exception) {
            throw $exception;
        }

        return [
            'url' => $loginLink->url,
        ];
    }

    private function createStripeAccount(Organisation $organisation): Account
    {
        $type = config('stripe.connect_account_type', 'express');

        $params = [
            'type' => $type,
            'metadata' => [
                'organisation_id' => (string) $organisation->id,
                'organisation_name' => $organisation->name ?? '',
            ],
        ];

        if ($type === 'express') {
            $params['capabilities'] = [
                'card_payments' => ['requested' => true],
                'transfers' => ['requested' => true],
                'sepa_debit_payments' => ['requested' => true],
            ];
        }

        return $this->stripe->accounts->create($params);
    }

    private function refreshStatusFromAccount(OrganisationStripeConnection $connection, Account $account): void
    {
        $disabledReason = data_get($account, 'requirements.disabled_reason');

        if ($disabledReason) {
            $connection->status = 'blocked';
            $connection->last_error = $disabledReason;

            return;
        }

        $chargesEnabled = (bool) data_get($account, 'charges_enabled');
        $payoutsEnabled = (bool) data_get($account, 'payouts_enabled');

        if ($chargesEnabled && $payoutsEnabled) {
            $connection->status = 'active';
            $connection->last_error = null;

            if (! $connection->activated_at) {
                $connection->activated_at = now();
            }

            return;
        }

        $connection->status = 'pending';
        $connection->last_error = null;
    }

    private function buildFrontendUrl(string $path): string
    {
        $base = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');

        return $base.'/'.ltrim($path, '/');
    }
}
