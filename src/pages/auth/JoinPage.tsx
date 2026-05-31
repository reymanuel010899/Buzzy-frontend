import { useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"

/**
 * /join?code=TOKEN
 * - Si el usuario tiene sesión → va al home (ya está registrado, no aplica el referido)
 * - Si no tiene sesión → va a /sign-up?code=TOKEN para que se registre con el código
 */
export default function JoinPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const code = searchParams.get("code") || ""
    const accessToken = localStorage.getItem("accessToken")

    if (accessToken) {
      // Ya tiene sesión, va al home
      navigate("/", { replace: true })
    } else {
      // Sin sesión → signup con código pre-cargado
      navigate(`/sign-up${code ? `?code=${code}` : ""}`, { replace: true })
    }
  }, [navigate, searchParams])

  return null
}
