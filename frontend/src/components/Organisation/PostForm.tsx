import React, { useState } from 'react'
import { Button } from '../ui/Button'

export type PostFormValues = {
  title: string
  body: string
  status: 'draft' | 'published'
}

export type PostFormErrors = Partial<Record<keyof PostFormValues, string>>

type PostFormProps = {
  initialValues: PostFormValues
  onSubmit: (values: PostFormValues) => Promise<void> | void
  errors: PostFormErrors
  generalError?: string | null
  isSubmitting: boolean
  submitLabel: string
}

const inputClassName = (hasError: boolean) =>
  `w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue ${
    hasError ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
  }`

const labelClassName = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'

const PostForm: React.FC<PostFormProps> = ({
  initialValues,
  onSubmit,
  errors,
  generalError,
  isSubmitting,
  submitLabel,
}) => {
  const [values, setValues] = useState<PostFormValues>(initialValues)

  const handleChange =
    (field: keyof PostFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {generalError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {generalError}
        </div>
      )}

      <div>
        <label htmlFor="title" className={labelClassName}>Titel</label>
        <input
          id="title"
          type="text"
          value={values.title}
          onChange={handleChange('title')}
          className={inputClassName(!!errors.title)}
          placeholder="Titel van het bericht"
        />
        {errors.title && <span className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</span>}
      </div>

      <div>
        <label htmlFor="body" className={labelClassName}>Bericht</label>
        <textarea
          id="body"
          rows={6}
          value={values.body}
          onChange={handleChange('body')}
          className={inputClassName(!!errors.body)}
          placeholder="Schrijf je mededeling voor de leden…"
        />
        {errors.body && <span className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.body}</span>}
      </div>

      <div>
        <label htmlFor="status" className={labelClassName}>Status</label>
        <select
          id="status"
          value={values.status}
          onChange={handleChange('status')}
          className={inputClassName(!!errors.status)}
        >
          <option value="published">Gepubliceerd (zichtbaar voor leden)</option>
          <option value="draft">Concept (niet zichtbaar)</option>
        </select>
        {errors.status && <span className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.status}</span>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Opslaan…' : submitLabel}
      </Button>
    </form>
  )
}

export default PostForm
