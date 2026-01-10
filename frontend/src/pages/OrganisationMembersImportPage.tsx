import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

type ValidRow = {
  row_number: number
  data: Record<string, string | null>
}

type InvalidRow = {
  row_number: number
  errors: string[]
}

type PreviewResponse = {
  total_rows: number
  valid_count: number
  invalid_count: number
  valid_rows: ValidRow[]
  invalid_rows: InvalidRow[]
  import_token: string
}

type ConfirmResponse = {
  imported_count: number
  skipped_count: number
  message?: string
}

const OrganisationMembersImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get('/api/organisation/members/import/template', {
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'leden_template.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download mislukt', error)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null
    setFile(selectedFile)
    setPreview(null)
    setPreviewError(null)
    setConfirmMessage(null)
    setConfirmError(null)
  }

  const handlePreviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!file) {
      setPreviewError('Selecteer een Excelbestand om te uploaden.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setIsPreviewing(true)
    setPreviewError(null)
    setConfirmMessage(null)
    setConfirmError(null)

    try {
      const { data } = await apiClient.post<PreviewResponse>(
        '/api/organisation/members/import/preview',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      )

      setPreview(data)
    } catch (error: any) {
      if (error.response?.status === 422) {
        setPreviewError('Het bestand is ongeldig. Controleer het formaat en de inhoud.')
      } else {
        setPreviewError('Voorvertoning mislukt. Probeer het later opnieuw.')
      }
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!preview?.import_token) {
      setConfirmError('Geen geldig importtoken gevonden. Upload het bestand opnieuw.')
      return
    }

    setIsConfirming(true)
    setConfirmError(null)
    setConfirmMessage(null)

    try {
      const { data } = await apiClient.post<ConfirmResponse>(
        '/api/organisation/members/import/confirm',
        {
          import_token: preview.import_token,
        },
      )

      setConfirmMessage(data.message ?? `${data.imported_count} leden geïmporteerd.`)
      setPreview(null)
      setFile(null)
    } catch (error: any) {
      if (error.response?.status === 404) {
        setConfirmError('Importtoken ongeldig of verlopen. Upload het bestand opnieuw.')
      } else {
        setConfirmError('Importeren mislukt. Probeer het later opnieuw.')
      }
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk upload leden</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Importeer meerdere leden tegelijk via Excel</p>
        </div>
        <Link to="/organisation/members">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} />
            Terug
          </Button>
        </Link>
      </div>

      {/* Instructions */}
      <Card className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <FileSpreadsheet className="text-aidatim-blue dark:text-aidatim-blue mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Hoe werkt het?</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Gebruik dit proces om leden in bulk toe te voegen. Download eerst het sjabloon, vul de gegevens in en
              upload het Excelbestand voor een voorvertoning. Alleen geldige rijen worden geïmporteerd.
            </p>
          </div>
        </div>
        <Button onClick={handleDownloadTemplate} variant="outline">
          <Download size={16} />
          Download sjabloon
        </Button>
      </Card>

      {/* Upload Section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="text-aidatim-blue dark:text-aidatim-blue" size={20} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload bestand</h3>
        </div>
        <form onSubmit={handlePreviewSubmit} className="space-y-4">
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selecteer Excel bestand (.xlsx, .xls)
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-aidatim-blue/10 file:text-aidatim-blue dark:file:bg-aidatim-blue/20 dark:file:text-aidatim-blue
                hover:file:bg-aidatim-blue/20 dark:hover:file:bg-aidatim-blue/30
                cursor-pointer
                border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-800"
            />
          </div>
          {previewError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
              {previewError}
            </div>
          )}
          <Button type="submit" disabled={isPreviewing || !file}>
            {isPreviewing ? 'Bezig met uploaden...' : 'Voorvertoning genereren'}
          </Button>
        </form>
      </Card>

      {preview && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileSpreadsheet className="text-aidatim-blue dark:text-aidatim-blue" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Voorvertoning</h3>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Totaal rijen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{preview.total_rows}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Geldig</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
                {preview.valid_count}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Ongeldig</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
                {preview.invalid_count}
              </p>
            </div>
          </div>

          {preview.valid_rows.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-green-600 dark:text-green-400" size={18} />
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  Geldige rijen (eerste {Math.min(preview.valid_rows.length, 10)})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Rij</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Lidnummer
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Voornaam
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Achternaam
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Plaats
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Contributiebedrag
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.valid_rows.slice(0, 10).map((row) => (
                      <tr
                        key={row.row_number}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-4 px-4 text-gray-900 dark:text-white">{row.row_number}</td>
                        <td className="py-4 px-4 text-gray-900 dark:text-white">
                          {row.data.member_number ?? '-'}
                        </td>
                        <td className="py-4 px-4 text-gray-900 dark:text-white">
                          {row.data.first_name ?? '-'}
                        </td>
                        <td className="py-4 px-4 text-gray-900 dark:text-white">
                          {row.data.last_name ?? '-'}
                        </td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{row.data.city ?? '-'}</td>
                        <td className="py-4 px-4 text-gray-900 dark:text-white">
                          {row.data.contribution_amount ?? '-'}
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="success">Actief</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.valid_rows.length > 10 && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  Er zijn {preview.valid_rows.length - 10} extra geldige rijen die niet worden weergegeven.
                </p>
              )}
            </div>
          )}

          {preview.invalid_rows.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="text-red-600 dark:text-red-400" size={18} />
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Ongeldige rijen</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Rij</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Fouten
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.invalid_rows.map((row) => (
                      <tr
                        key={row.row_number}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-4 px-4 text-gray-900 dark:text-white font-medium">
                          {row.row_number}
                        </td>
                        <td className="py-4 px-4">
                          <ul className="list-disc list-inside space-y-1">
                            {row.errors.map((error, index) => (
                              <li key={index} className="text-sm text-red-600 dark:text-red-400">
                                {error}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {preview && preview.valid_count > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="text-aidatim-blue dark:text-aidatim-blue" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Importeer</h3>
          </div>

          {confirmError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
              {confirmError}
            </div>
          )}
          {confirmMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
              {confirmMessage}
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            <Button onClick={handleConfirmImport} disabled={isConfirming}>
              {isConfirming ? 'Bezig met importeren...' : 'Importeer geldige rijen'}
            </Button>
            {confirmMessage && (
              <Link
                to="/organisation/members"
                className="text-aidatim-blue dark:text-aidatim-blue hover:underline flex items-center gap-1"
              >
                Ga naar ledenoverzicht
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

export default OrganisationMembersImportPage


