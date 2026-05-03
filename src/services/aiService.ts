import { apiClient } from "@/redux/client/api-client"

export interface AITemplate {
  id: number
  title: string
  prompt: string
  image_url: string | null
  media_type: 'image' | 'video'
  order: number
}

export interface AIStyle {
  id: number
  name: string
  slug: string
  description: string
  icon_name: string
  color_bg: string
  color_text: string
  color_border: string
  order: number
  templates: AITemplate[]
}

export interface AIGenerationHistory {
  id: number
  prompt: string
  media_url: string
  media_type: 'image' | 'video'
  style_name: string | null
  created_at: string
}

export const getAIStyles = async (): Promise<AIStyle[]> => {
  const response = await apiClient.get('api/ai/styles/')
  return response.data
}

export const getTemplatesByStyleSlug = async (slug: string): Promise<AITemplate[]> => {
  const styles = await getAIStyles()
  const style = styles.find((s) => s.slug === slug)
  return style?.templates ?? []
}

export interface AIGenerateAccepted {
  message: string
  history_id: number
  celery_task_id: string
  video_credits: number
  image_credits: number
}

export interface AIGenerationStatus {
  history_id: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  media_url: string | null
  media_type: 'video' | 'image'
}

/** Envía el job de generación — el backend responde 202 inmediatamente. */
export const generateAI = async (params: {
  prompt: string
  type: 'video' | 'image'
  style: string
  duration?: number
  reference_image?: File | null
}): Promise<AIGenerateAccepted> => {
  const formData = new FormData()
  formData.append('prompt', params.prompt)
  formData.append('type', params.type)
  formData.append('style', params.style)
  if (params.duration) {
    formData.append('duration', String(params.duration))
  }
  if (params.reference_image) {
    formData.append('reference_image', params.reference_image)
  }
  const response = await apiClient.post('api/ai/generate/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30_000,
  })
  return response.data
}

/** Consulta el estado de una generación. Úsalo con polling cada 5s. */
export const getAIGenerationStatus = async (historyId: number): Promise<AIGenerationStatus> => {
  const response = await apiClient.get(`api/ai/status/${historyId}/`)
  return response.data
}

/**
 * Wrapper que encola el job y hace polling hasta completar/fallar.
 * Llama a onProgress con el status en cada tick.
 */
export const generateAIAndWait = async (
  params: Parameters<typeof generateAI>[0],
  onProgress?: (status: AIGenerationStatus['status']) => void,
  pollIntervalMs = 5_000,
  maxWaitMs = 360_000,
): Promise<{ media_url: string; video_credits: number; image_credits: number }> => {
  const accepted = await generateAI(params)

  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollIntervalMs))
    const result = await getAIGenerationStatus(accepted.history_id)
    onProgress?.(result.status)

    if (result.status === 'completed' && result.media_url) {
      return {
        media_url: result.media_url,
        video_credits: accepted.video_credits,
        image_credits: accepted.image_credits,
      }
    }
    if (result.status === 'failed') {
      throw new Error('La generación falló. Intenta de nuevo.')
    }
  }
  throw new Error('Tiempo de espera agotado. La generación está tardando más de lo esperado.')
}

export const getAIHistory = async (): Promise<AIGenerationHistory[]> => {
  const response = await apiClient.get('api/ai/history/')
  return response.data
}

export interface AICredits {
  video_credits: number
  image_credits: number
}

export interface AIPackage {
  id: number
  name: string
  description: string
  videos_count: number
  images_count: number
  price: string
  is_featured: boolean
  order: number
}

export interface PurchaseResult {
  message: string
  videos_added: number
  images_added: number
  video_credits: number
  image_credits: number
  wallet_balance: string
}

export const getAICredits = async (): Promise<AICredits> => {
  const response = await apiClient.get('api/ai/credits/')
  return response.data
}

export const getAIPackages = async (): Promise<AIPackage[]> => {
  const response = await apiClient.get('api/ai/packages/')
  return response.data
}

export const purchaseAIPackage = async (packageId: number): Promise<PurchaseResult> => {
  const response = await apiClient.post('api/ai/packages/purchase/', { package_id: packageId })
  return response.data
}

export const purchaseAICustom = async (customAmount: number): Promise<PurchaseResult> => {
  const response = await apiClient.post('api/ai/packages/purchase/', { custom_amount: customAmount })
  return response.data
}
