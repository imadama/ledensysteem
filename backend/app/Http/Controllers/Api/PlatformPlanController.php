<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PlatformPlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::query()
            ->orderBy('monthly_price')
            ->orderBy('name')
            ->get();

        $data = $plans->map(fn (Plan $plan) => [
            'id' => $plan->id,
            'name' => $plan->name,
            'stripe_price_id' => $plan->stripe_price_id,
            'monthly_price' => (float) $plan->monthly_price,
            'currency' => $plan->currency,
            'description' => $plan->description,
            'is_active' => (bool) $plan->is_active,
            'created_at' => $plan->created_at?->toIso8601String(),
            'updated_at' => $plan->updated_at?->toIso8601String(),
        ])->values();

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);

        $plan = Plan::create($data);

        return response()->json($this->transformPlan($plan), Response::HTTP_CREATED);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $plan = Plan::findOrFail($id);

        $data = $this->validateData($request, $plan);

        $plan->update($data);

        return response()->json($this->transformPlan($plan->fresh()));
    }

    public function destroy(int $id): JsonResponse
    {
        $plan = Plan::findOrFail($id);

        // Check of er subscriptions zijn (niet alleen actieve, maar alle)
        $totalSubscriptions = $plan->organisationSubscriptions()->count();
        $activeSubscriptions = $plan->organisationSubscriptions()
            ->where('status', 'active')
            ->count();

        if ($totalSubscriptions > 0) {
            $message = 'Dit plan kan niet worden verwijderd omdat er ';
            if ($activeSubscriptions > 0) {
                $message .= "{$activeSubscriptions} actieve abonnement(en) zijn gekoppeld aan dit plan.";
            } else {
                $message .= "{$totalSubscriptions} abonnement(en) zijn gekoppeld aan dit plan (ook al zijn ze niet actief).";
            }
            
            return response()->json([
                'message' => $message,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $plan->delete();

        return response()->json(status: Response::HTTP_NO_CONTENT);
    }

    protected function validateData(Request $request, ?Plan $plan = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'stripe_price_id' => ['required', 'string', 'max:255'],
            'monthly_price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:10'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    protected function transformPlan(Plan $plan): array
    {
        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'stripe_price_id' => $plan->stripe_price_id,
            'monthly_price' => (float) $plan->monthly_price,
            'currency' => $plan->currency,
            'description' => $plan->description,
            'is_active' => (bool) $plan->is_active,
            'created_at' => $plan->created_at?->toIso8601String(),
            'updated_at' => $plan->updated_at?->toIso8601String(),
        ];
    }
}
