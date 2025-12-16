import { type FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../api/axios'
import { Button } from '../components/ui/Button'

type FormValues = {
  first_name: string
  last_name: string
  gender: 'm' | 'f'
  birth_date: string
  email: string
  street_address: string
  postal_code: string
  city: string
  iban: string
  contribution_amount: string
  contribution_start_date: string
  contribution_note: string
  sepa_consent: boolean
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const PublicMemberRegistrationPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orgId = searchParams.get('org_id')

  const [values, setValues] = useState<FormValues>({
    first_name: '',
    last_name: '',
    gender: 'm',
    birth_date: '',
    email: '',
    street_address: '',
    postal_code: '',
    city: '',
    iban: '',
    contribution_amount: '',
    contribution_start_date: '',
    contribution_note: '',
    sepa_consent: false,
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: keyof FormValues) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (field === 'sepa_consent') {
      setValues((prev) => ({
        ...prev,
        [field]: (event.target as HTMLInputElement).checked,
      }))
    } else {
      setValues((prev) => ({
        ...prev,
        [field]: event.target.value,
      }))
    }
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const formatDateForInput = (dateStr: string): string => {
    if (!dateStr) return ''
    // Convert dd-MM-yyyy to yyyy-MM-dd for HTML date input
    const parts = dateStr.split('-')
    if (parts.length === 3 && parts[0].length === 2) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return dateStr
  }

  const formatDateForBackend = (dateStr: string): string => {
    if (!dateStr) return ''
    // Convert yyyy-MM-dd to dd-MM-yyyy for backend
    const parts = dateStr.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return dateStr
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    setGeneralError(null)
    setIsSubmitting(true)

    try {
      const payload: any = {
        ...values,
        birth_date: values.birth_date ? formatDateForBackend(values.birth_date) : null,
        contribution_start_date: formatDateForBackend(values.contribution_start_date),
        contribution_amount: Number(values.contribution_amount),
      }

      if (orgId) {
        payload.org_id = orgId
      }

      await apiClient.post('/api/public/member-registration', payload)

      navigate('/aanmelden/succes', { replace: true })
    } catch (err: any) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors ?? {}
        setErrors(validationErrors)
        setGeneralError('Er zijn validatiefouten. Controleer de ingevulde gegevens.')
      } else {
        setGeneralError(
          err.response?.data?.message ||
            'Er is een fout opgetreden bij het verzenden van het formulier. Probeer het later opnieuw.'
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName = (hasError: boolean) =>
    `w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
      hasError
        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
        : 'border-gray-300 dark:border-gray-600'
    }`

  const labelClassName = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Lidmaatschap & Contributiemachtiging
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-8">
            Süleyman Çelebi Moskee / Üyelik ve Aidat Talimat Formu
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Wanneer u dit formulier indient, worden uw gegevens, zoals naam en e-mailadres, niet
            automatisch verzameld, tenzij u het zelf opgeeft.
          </p>

          {generalError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className={labelClassName}>
                  1. Voornaam/Isim <span className="text-red-500">*</span>
                </label>
                <input
                  id="first_name"
                  type="text"
                  required
                  value={values.first_name}
                  onChange={handleChange('first_name')}
                  className={inputClassName(!!errors.first_name)}
                  placeholder="Voer uw antwoord in"
                />
                {errors.first_name && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.first_name}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className={labelClassName}>
                  2. Achternaam/Soyisim <span className="text-red-500">*</span>
                </label>
                <input
                  id="last_name"
                  type="text"
                  required
                  value={values.last_name}
                  onChange={handleChange('last_name')}
                  className={inputClassName(!!errors.last_name)}
                  placeholder="Voer uw antwoord in"
                />
                {errors.last_name && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.last_name}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="gender" className={labelClassName}>
                  3. Geslacht/Cinsiyet <span className="text-red-500">*</span>
                </label>
                <select
                  id="gender"
                  required
                  value={values.gender}
                  onChange={handleChange('gender')}
                  className={inputClassName(!!errors.gender)}
                >
                  <option value="m">Man/Bay</option>
                  <option value="f">Vrouw/Bayan</option>
                </select>
                {errors.gender && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.gender}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="birth_date" className={labelClassName}>
                  4. Geboortedatum/Dogum Tarihi
                </label>
                <input
                  id="birth_date"
                  type="date"
                  value={values.birth_date}
                  onChange={handleChange('birth_date')}
                  className={inputClassName(!!errors.birth_date)}
                />
                {errors.birth_date && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.birth_date}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="email" className={labelClassName}>
                  5. Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={values.email}
                  onChange={handleChange('email')}
                  className={inputClassName(!!errors.email)}
                  placeholder="Voer uw antwoord in"
                />
                {errors.email && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.email}
                  </span>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="street_address" className={labelClassName}>
                  6. Adres <span className="text-red-500">*</span>
                </label>
                <input
                  id="street_address"
                  type="text"
                  required
                  value={values.street_address}
                  onChange={handleChange('street_address')}
                  className={inputClassName(!!errors.street_address)}
                  placeholder="Voer uw antwoord in"
                />
                {errors.street_address && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.street_address}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="postal_code" className={labelClassName}>
                  7. Postcode <span className="text-red-500">*</span>
                </label>
                <input
                  id="postal_code"
                  type="text"
                  required
                  value={values.postal_code}
                  onChange={handleChange('postal_code')}
                  className={inputClassName(!!errors.postal_code)}
                  placeholder="Voer uw antwoord in"
                />
                {errors.postal_code && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.postal_code}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="city" className={labelClassName}>
                  8. Woonplaats/Ikamet yeri <span className="text-red-500">*</span>
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  value={values.city}
                  onChange={handleChange('city')}
                  className={inputClassName(!!errors.city)}
                  placeholder="Voer uw antwoord in"
                />
                {errors.city && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.city}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="iban" className={labelClassName}>
                  9. IBAN <span className="text-red-500">*</span>
                </label>
                <input
                  id="iban"
                  type="text"
                  required
                  value={values.iban}
                  onChange={handleChange('iban')}
                  className={inputClassName(!!errors.iban)}
                  placeholder="Voer uw antwoord in"
                />
                {errors.iban && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.iban}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="contribution_amount" className={labelClassName}>
                  10. Contributiebedrag/Katkı payı <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[10, 15, 20, 25].map((amount) => (
                    <label
                      key={amount}
                      className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <input
                        type="radio"
                        name="contribution_amount"
                        value={amount}
                        checked={values.contribution_amount === String(amount)}
                        onChange={handleChange('contribution_amount')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">€{amount}</span>
                    </label>
                  ))}
                </div>
                {errors.contribution_amount && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.contribution_amount}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="contribution_start_date" className={labelClassName}>
                  11. Start Contributie/Başlangıc üyelik <span className="text-red-500">*</span>
                </label>
                <input
                  id="contribution_start_date"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={values.contribution_start_date}
                  onChange={handleChange('contribution_start_date')}
                  className={inputClassName(!!errors.contribution_start_date)}
                />
                {errors.contribution_start_date && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.contribution_start_date}
                  </span>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="contribution_note" className={labelClassName}>
                  12. Opmerking/Açıklama
                </label>
                <textarea
                  id="contribution_note"
                  rows={4}
                  value={values.contribution_note}
                  onChange={handleChange('contribution_note')}
                  className={inputClassName(!!errors.contribution_note)}
                  placeholder="Voer uw antwoord in"
                />
                {errors.contribution_note && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.contribution_note}
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                13. SEPA Machtiging
              </h3>
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <p className="mb-2">
                    Door ondertekening van dit formulier geeft u toestemming aan Süleyman Çelebi
                    Moskee Gorinchem om doorlopende incasso-opdrachten te sturen naar uw bank om een
                    bedrag van uw rekening af te schrijven wegens contributie bijdrage en uw bank om
                    doorlopend een bedrag van uw rekening af te schrijven overeenkomstig de opdracht
                    van Süleyman Çelebi Moskee Gorinchem. Als u het niet eens bent met deze
                    afschrijving kunt u deze laten terugboeken. Neem hiervoor binnen acht weken na
                    afschrijving contact op met uw bank. Vraag uw bank naar de voorwaarden. Door op
                    'Akkoord' te klikken, bevestigt u uitdrukkelijk dat u instemt met de inhoud
                    van dit document en dat deze handeling wordt beschouwd als een rechtsgeldige
                    digitale handtekening in de zin van de toepasselijke wet- en regelgeving.
                  </p>
                  <p>
                    Bu formu imzalayarak, Süleyman Çelebi Camii Gorinchem'in bankanıza düzenli ödeme
                    talimatları göndermesine ve aidat ödemesi kapsamında hesabınızdan tutar
                    çekilmesine; bankanızın ise Süleyman Çelebi Camii Gorinchem'in talimatına uygun
                    olarak hesabınızdan düzenli olarak ödeme çekmesine izin vermiş olursunuz. Bu
                    ödemeye itiraz etmeniz halinde, söz konusu tutarı geri alma hakkınız
                    bulunmaktadır. Bunun için, kesintiden itibaren sekiz hafta içinde bankanızla
                    iletişime geçiniz. Şartlar hakkında bankanızdan bilgi alınız. 'Kabul Ediyorum'
                    butonuna tıklayarak, bu belgenin içeriğini açıkça onayladığınızı ve bu işlemin
                    yürürlükteki mevzuat kapsamında geçerli bir dijital imza olarak kabul edildiğini
                    beyan edersiniz.
                  </p>
                </div>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={values.sepa_consent}
                    onChange={handleChange('sepa_consent')}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>Akkoord/Kabul ediyorum</strong>
                  </span>
                </label>
                {errors.sepa_consent && (
                  <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">
                    {errors.sepa_consent}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Bezig met verzenden...' : 'Verzenden'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PublicMemberRegistrationPage
