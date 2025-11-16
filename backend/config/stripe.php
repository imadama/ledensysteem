<?php

return [
    'secret' => env('STRIPE_SECRET'),
    'public_key' => env('STRIPE_PUBLIC_KEY'),
    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    'connect_client_id' => env('STRIPE_CONNECT_CLIENT_ID'),
    'connect_account_type' => env('STRIPE_CONNECT_ACCOUNT_TYPE', 'express'),
    'default_currency' => env('STRIPE_DEFAULT_CURRENCY', 'eur'),
    'plans' => [
        'basic_price_id' => env('STRIPE_PRICE_BASIC'),
        'plus_price_id' => env('STRIPE_PRICE_PLUS'),
    ],
];
