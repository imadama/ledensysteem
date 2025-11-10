<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="utf-8">
    <title>{{ __('Uitnodiging ledenportaal') }}</title>
</head>
<body>
<p>{{ __('Beste :name,', ['name' => $member?->full_name ?? __('lid')]) }}</p>

<p>
    {{ __('Je bent uitgenodigd voor het ledenportaal van :organisation.', ['organisation' => $organisation?->name ?? config('app.name')]) }}
    {{ __('Via het portaal kun je je gegevens bekijken en je contributie-informatie opvolgen.') }}
</p>

<p>
    <a href="{{ $activationUrl }}">{{ __('Activeer je account') }}</a>
</p>

<p>
    {{ __('De uitnodiging verloopt op :date.', ['date' => optional($invitation->expires_at)->translatedFormat('d-m-Y H:i')]) }}
</p>

<p>
    {{ __('Let op: deze link is persoonlijk. Deel hem niet met anderen.') }}
</p>

<p>{{ __('Met vriendelijke groet,') }}<br>{{ $organisation?->name ?? config('app.name') }}</p>
</body>
</html>


