<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;

class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::query()
            ->where('is_active', true)
            ->orderBy('monthly_price')
            ->get(['id', 'name', 'monthly_price', 'currency', 'description']);

        $data = $plans->map(fn (Plan $plan) => [
            'id' => $plan->id,
            'name' => $plan->name,
            'monthly_price' => (float) $plan->monthly_price,
            'currency' => $plan->currency,
            'description' => $plan->description,
        ])->values();

        return response()->json(['data' => $data]);
    }
}
