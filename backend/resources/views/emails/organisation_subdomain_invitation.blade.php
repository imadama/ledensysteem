<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="utf-8">
    <title>{{ __('Jullie subdomein URL') }}</title>
</head>
<body>
<p>{{ __('Beste :name,', ['name' => $organisation->name ?? __('organisatie')]) }}</p>

<p>
    {{ __('Dit is jullie subdomein URL om in te loggen:') }}
</p>

<p style="font-size: 18px; font-weight: bold; margin: 20px 0;">
    <a href="{{ $subdomainUrl }}" style="color: #4F46E5; text-decoration: none;">{{ $subdomainUrl }}</a>
</p>

<p>
    {{ __('Via deze URL kunnen jullie en jullie leden inloggen op het ledensysteem.') }}
    {{ __('Deel deze URL met jullie leden zodat zij zich kunnen registreren en inloggen.') }}
</p>

<p>
    {{ __('Jullie subdomein slug is: :subdomain', ['subdomain' => $organisation->subdomain]) }}
</p>

<p>
    {{ __('Met vriendelijke groet,') }}<br>
    {{ config('app.name', 'Ledenportaal') }}
</p>
</body>
</html>
