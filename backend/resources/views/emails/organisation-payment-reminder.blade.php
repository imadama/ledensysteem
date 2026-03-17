<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="utf-8">
    <title>{{ __('Herinnering: kies je abonnement') }}</title>
</head>
<body style="font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 32px 16px;">

<p>{{ __('Beste :name,', ['name' => $user->first_name]) }}</p>

<p>
    {{ __('Je account voor :organisation is aangemaakt, maar je hebt nog geen abonnement gekozen.', ['organisation' => $organisation->name]) }}
</p>

<p>
    {{ __('Kies een abonnement om te starten. Zonder actief abonnement is de toegang tot Aidatim beperkt.') }}
</p>

<p style="margin: 32px 0;">
    <a href="{{ $subscriptionUrl }}"
       style="background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
        {{ __('Kies je abonnement') }}
    </a>
</p>

<p>
    {{ __('Lukt het niet via de knop? Kopieer dan deze link naar je browser:') }}<br>
    <a href="{{ $subscriptionUrl }}" style="color: #4F46E5;">{{ $subscriptionUrl }}</a>
</p>

<p>
    {{ __('Heb je vragen? Neem gerust contact met ons op via') }}
    <a href="mailto:info@aidatim.nl" style="color: #4F46E5;">info@aidatim.nl</a>.
</p>

<p>
    {{ __('Met vriendelijke groet,') }}<br>
    {{ __('Het Aidatim-team') }}
</p>

</body>
</html>
