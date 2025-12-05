<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PlatformSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = PlatformSetting::query()
            ->orderBy('key')
            ->get()
            ->map(fn ($setting) => [
                'key' => $setting->key,
                'value' => $setting->value,
                'description' => $setting->description,
            ])
            ->values();

        return response()->json(['data' => $settings]);
    }

    public function show(string $key): JsonResponse
    {
        $setting = PlatformSetting::where('key', $key)->first();

        if (! $setting) {
            return response()->json([
                'message' => __('Setting niet gevonden.'),
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'key' => $setting->key,
            'value' => $setting->value,
            'description' => $setting->description,
        ]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $validated = $request->validate([
            'value' => ['required'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        PlatformSetting::updateOrCreate(
            ['key' => $key],
            [
                'value' => $validated['value'],
                'description' => $validated['description'] ?? null,
            ]
        );

        return response()->json([
            'message' => __('Setting bijgewerkt.'),
        ]);
    }

    public function getPaymentMethods(): JsonResponse
    {
        $methods = PlatformSetting::getPaymentMethods();

        return response()->json([
            'payment_methods' => $methods,
        ]);
    }

    public function updatePaymentMethods(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_methods' => ['required', 'array'],
            'payment_methods.*' => ['required', 'string', 'in:card,sepa_debit,ideal,bancontact,sofort'],
        ]);

        PlatformSetting::setPaymentMethods($validated['payment_methods']);

        return response()->json([
            'message' => __('Betaalmethodes bijgewerkt.'),
            'payment_methods' => $validated['payment_methods'],
        ]);
    }
}
