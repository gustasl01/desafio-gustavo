const API_URL = 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    let message = 'Não foi possível concluir a operação.'
    try {
      const body = await response.json()
      message = body.message || body.detail || message
    } catch {
      // Mantém a mensagem padrão quando a API não retorna JSON.
    }
    throw new Error(message)
  }

  return response.json()
}

export function getSalas() {
  return request('/salas')
}

export function getReservas(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/reserva_sala${query}`)
}

export function criarReserva(reserva) {
  return request('/reserva_sala', {
    method: 'POST',
    body: JSON.stringify(reserva),
  })
}

export function cancelarReserva(id) {
  return request(`/reserva_sala/${id}/cancelar`, {
    method: 'PATCH',
  })
}
