import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/axios'

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
    <div>
      <div className="page-header">
        <h1>Bulk upload leden</h1>
      </div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p>
          Gebruik dit proces om leden in bulk toe te voegen. Download eerst het sjabloon, vul de gegevens in en
          upload het Excelbestand voor een voorvertoning. Alleen geldige rijen worden geïmporteerd.
        </p>
        <button type="button" className="button" onClick={handleDownloadTemplate}>
          Download sjabloon
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Upload bestand</h2>
        <form onSubmit={handlePreviewSubmit}>
          <div className="form-group">
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
          </div>
          {previewError && <div className="alert alert--error">{previewError}</div>}
          <button type="submit" className="button" disabled={isPreviewing}>
            {isPreviewing ? 'Bezig met uploaden...' : 'Voorvertoning genereren'}
          </button>
        </form>
      </div>

      {preview && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Voorvertoning</h2>
          <p>
            Totaal: <strong>{preview.total_rows}</strong> rijen — Geldig: <strong>{preview.valid_count}</strong> —
            Ongeldig: <strong>{preview.invalid_count}</strong>
          </p>

          {preview.valid_rows.length > 0 && (
            <>
              <h3>Geldige rijen (eerste {Math.min(preview.valid_rows.length, 10)})</h3>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rij</th>
                      <th>Lidnummer</th>
                      <th>Voornaam</th>
                      <th>Achternaam</th>
                      <th>Plaats</th>
                      <th>Contributiebedrag</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.valid_rows.slice(0, 10).map((row) => (
                      <tr key={row.row_number}>
                        <td>{row.row_number}</td>
                        <td>{row.data.member_number ?? '-'}</td>
                        <td>{row.data.first_name ?? '-'}</td>
                        <td>{row.data.last_name ?? '-'}</td>
                        <td>{row.data.city ?? '-'}</td>
                        <td>{row.data.contribution_amount ?? '-'}</td>
                        <td>Actief</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.valid_rows.length > 10 && (
                <p style={{ marginTop: '0.5rem' }}>
                  Er zijn {preview.valid_rows.length - 10} extra geldige rijen die niet worden weergegeven.
                </p>
              )}
            </>
          )}

          {preview.invalid_rows.length > 0 && (
            <>
              <h3>Ongeldige rijen</h3>
              <div className="table-responsive">
                <table className="table table--sm">
                  <thead>
                    <tr>
                      <th>Rij</th>
                      <th>Fouten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.invalid_rows.map((row) => (
                      <tr key={row.row_number}>
                        <td>{row.row_number}</td>
                        <td>
                          <ul className="list">
                            {row.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {preview && preview.valid_count > 0 && (
        <div className="card">
          <h2>Importeer</h2>
          {confirmError && <div className="alert alert--error">{confirmError}</div>}
          {confirmMessage && <div className="alert alert--success">{confirmMessage}</div>}
          <button type="button" className="button" onClick={handleConfirmImport} disabled={isConfirming}>
            {isConfirming ? 'Bezig met importeren...' : 'Importeer geldige rijen'}
          </button>
          {confirmMessage && (
            <p style={{ marginTop: '1rem' }}>
              <Link to="/organisation/members">Ga naar ledenoverzicht</Link>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default OrganisationMembersImportPage


