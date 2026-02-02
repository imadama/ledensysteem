# Testplan Ledensysteem (Aidatim)

## 1. Multi-Tenancy & Privacy (Cruciaal)
- [ ] **Cross-organisatie lekken:** Probeer als Admin van Organisatie A de URL of API van Organisatie B te benaderen.
    - *Verwacht:* 403 Forbidden.
- [ ] **Subdomein validatie:** Wat gebeurt er als je een niet-bestaand subdomein bezoekt?
    - *Verwacht:* 404 of redirect naar hoofdpagina.
- [ ] **User Isolation:** Kan een gebruiker van Org A inloggen op het domein van Org B?
    - *Verwacht:* Inloggen mislukt (gebruiker niet gevonden in die context).

## 2. Platform Admin (De "Superuser")
- [ ] **Organisatie Beheer:** Maak een nieuwe organisatie aan, blokkeer deze en kijk of de Admin van die organisatie er nog in kan.
- [ ] **Billing Status:** Zet de `billing_status` op 'overdue' en check of de Monitor pagina nog werkt, maar de rest van de admin-tools geblokkeerd zijn.
- [ ] **Plans:** Pas een prijs aan in de `plans` tabel en kijk of dit correct reflecteert bij nieuwe organisatie-aanmeldingen.

## 3. Organisatie Admin (De Beheerder)
- [ ] **Bulk Import:** Upload een Excel/CSV met 10 leden. Check of dubbele e-mailadressen correct worden afgevangen.
- [ ] **Lid Uitnodigen:** Nodig een lid uit, kopieer de token uit de database (of mail) en doorloop het activatieproces.
- [ ] **Rollenbeheer:** Probeer een andere gebruiker de rol 'Monitor' te geven en check of diegene inderdaad geen leden kan bewerken.

## 4. Lid / Member (Het Portaal)
- [ ] **Self-Service:** Wijzig je telefoonnummer in het portaal en check in de database/admin-omgeving of dit direct is aangepast.
- [ ] **Betalingen:** Start een betalingssessie voor een contributie. Breekt de sessie af? Check of de status op 'created' blijft staan en niet op 'paid'.
- [ ] **Privacy:** Kan een lid de gegevens van een ander lid zien via de API? (Test `/api/member/profile`).

## 5. Stripe & Webhooks (De Motor)
- [ ] **Webhook Test:** Gebruik de Stripe CLI om een `checkout.session.completed` event te simuleren. Check of de `payment_transactions` tabel wordt bijgewerkt.
- [ ] **SEPA Flow:** Test of een SEPA-mandaat correct wordt opgeslagen bij een lid na een succesvolle eerste betaling.
