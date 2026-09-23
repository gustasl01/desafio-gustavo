import { useEffect, useMemo, useState } from 'react'
import {
  cancelarReserva,
  criarReserva,
  getReservas,
  getSalas,
} from './api'

const FILTERS = [
  { label: 'Todas', value: '' },
  { label: 'Ativas', value: 'Ativo' },
  { label: 'Canceladas', value: 'Cancelado' },
]

const EMPTY_FORM = {
  sala_id: '',
  data_reserva: '',
  inicio: '',
  fim: '',
  reservante: '',
}

function formatDate(value) {
  if (!value) return '-'
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

function formatTime(value) {
  if (value === null || value === undefined || value === '') return '-'

  if (typeof value === 'number') {
    const hours = Math.floor(value / 3600) % 24
    const minutes = Math.floor((value % 3600) / 60)
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  return String(value).slice(0, 5)
}

function getStatus(reserva) {
  return reserva.status === 'Cancelado' ? 'Cancelado' : 'Ativo'
}

function App() {
  const [salas, setSalas] = useState([])
  const [reservas, setReservas] = useState([])
  const [reservasParaRelatorio, setReservasParaRelatorio] = useState([])
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [cancelandoId, setCancelandoId] = useState(null)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const nomesDasSalas = useMemo(
    () => Object.fromEntries(salas.map((sala) => [sala.id, sala.nome])),
    [salas],
  )

  const contagemPorSala = useMemo(() => {
    const contagens = Object.fromEntries(salas.map((sala) => [sala.id, 0]))
    reservasParaRelatorio.forEach((reserva) => {
      if (reserva.status === 'Ativo' && reserva.sala_id in contagens) {
        contagens[reserva.sala_id] += 1
      }
    })
    return contagens
  }, [reservasParaRelatorio, salas])

  async function carregarReservas(status, atualizarRelatorio = false) {
    const dados = await getReservas(status)
    setReservas(dados)
    if (atualizarRelatorio) setReservasParaRelatorio(dados)
  }

  useEffect(() => {
    async function carregarDadosIniciais() {
      try {
        const [salasData, reservasData] = await Promise.all([
          getSalas(),
          getReservas(),
        ])
        setSalas(salasData)
        setReservas(reservasData)
        setReservasParaRelatorio(reservasData)
      } catch (error) {
        setErro(error.message)
      } finally {
        setCarregando(false)
      }
    }

    carregarDadosIniciais()
  }, [])

  async function atualizarLista(novaMensagem = '') {
    try {
      const [reservasFiltradas, todas] = await Promise.all([
        getReservas(filtro),
        getReservas(),
      ])
      setReservas(reservasFiltradas)
      setReservasParaRelatorio(todas)
      setMensagem(novaMensagem)
      setErro('')
    } catch (error) {
      setErro(error.message)
    }
  }

  function atualizarCampo(event) {
    const { name, value } = event.target
    setForm((atual) => ({ ...atual, [name]: value }))
  }

  async function enviarReserva(event) {
    event.preventDefault()
    setSalvando(true)
    setErro('')
    setMensagem('')

    try {
      await criarReserva({
        ...form,
        sala_id: Number(form.sala_id),
      })
      setForm(EMPTY_FORM)
      await atualizarLista('Reserva criada com sucesso.')
    } catch (error) {
      setErro(error.message)
    } finally {
      setSalvando(false)
    }
  }

  async function cancelar(id) {
    setCancelandoId(id)
    setErro('')
    setMensagem('')
    try {
      await cancelarReserva(id)
      await atualizarLista('Reserva cancelada.')
    } catch (error) {
      setErro(error.message)
    } finally {
      setCancelandoId(null)
    }
  }

  async function alterarFiltro(novoFiltro) {
    setFiltro(novoFiltro)
    setErro('')
    try {
      await carregarReservas(novoFiltro)
    } catch (error) {
      setErro(error.message)
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Centro Universitário</p>
          <h1>Reservas de salas</h1>
          <p className="intro">Organize os espaços do campus com clareza.</p>
        </div>
        <div className="header-mark" aria-hidden="true">RU</div>
      </header>

      {erro && <div className="alert alert-error" role="alert">{erro}</div>}
      {mensagem && <div className="alert alert-success" role="status">{mensagem}</div>}

      <section className="content-grid">
        <section className="panel form-panel" aria-labelledby="new-reservation-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Novo agendamento</p>
              <h2 id="new-reservation-title">Reserve um espaço</h2>
            </div>
            <span className="step-badge">01</span>
          </div>
          <form onSubmit={enviarReserva}>
            <label>
              Sala
              <select name="sala_id" value={form.sala_id} onChange={atualizarCampo} required>
                <option value="">Selecione uma sala</option>
                {salas.map((sala) => (
                  <option key={sala.id} value={sala.id}>{sala.nome}</option>
                ))}
              </select>
            </label>
            <label>
              Data
              <input type="date" name="data_reserva" value={form.data_reserva} onChange={atualizarCampo} required />
            </label>
            <div className="form-row">
              <label>
                Início
                <input type="time" name="inicio" value={form.inicio} onChange={atualizarCampo} required />
              </label>
              <label>
                Fim
                <input type="time" name="fim" value={form.fim} onChange={atualizarCampo} required />
              </label>
            </div>
            <label>
              Quem está reservando?
              <input type="text" name="reservante" value={form.reservante} onChange={atualizarCampo} placeholder="Nome completo" maxLength="150" required />
            </label>
            <button className="primary-button" type="submit" disabled={salvando || carregando}>
              {salvando ? 'Reservando...' : 'Reservar'}
            </button>
          </form>
        </section>

        <section className="panel list-panel" aria-labelledby="reservations-title">
          <div className="section-heading list-heading">
            <div>
              <p className="section-kicker">Agenda do campus</p>
              <h2 id="reservations-title">Reservas</h2>
            </div>
            <span className="count-label">{reservas.length} {reservas.length === 1 ? 'registro' : 'registros'}</span>
          </div>
          <div className="filter-bar" role="group" aria-label="Filtrar reservas">
            {FILTERS.map((item) => (
              <button
                className={filtro === item.value ? 'filter-button active' : 'filter-button'}
                key={item.label}
                type="button"
                onClick={() => alterarFiltro(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {carregando ? (
            <p className="empty-state">Carregando reservas...</p>
          ) : reservas.length === 0 ? (
            <p className="empty-state">Nenhuma reserva encontrada neste filtro.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sala</th>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Reservante</th>
                    <th>Status</th>
                    <th><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((reserva) => (
                    <tr key={reserva.id}>
                      <td className="room-cell">{nomesDasSalas[reserva.sala_id] || `Sala ${reserva.sala_id}`}</td>
                      <td>{formatDate(reserva.data_reserva)}</td>
                      <td>{formatTime(reserva.inicio)}–{formatTime(reserva.fim)}</td>
                      <td>{reserva.reservante}</td>
                      <td><span className={`status status-${getStatus(reserva).toLowerCase()}`}>{getStatus(reserva)}</span></td>
                      <td className="action-cell">
                        {getStatus(reserva) === 'Ativo' && (
                          <button className="cancel-button" type="button" onClick={() => cancelar(reserva.id)} disabled={cancelandoId === reserva.id}>
                            {cancelandoId === reserva.id ? 'Cancelando...' : 'Cancelar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      <section className="report-section" aria-labelledby="report-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Visão geral</p>
            <h2 id="report-title">Reservas ativas por sala</h2>
          </div>
          <span className="report-note">Atualizado com a agenda carregada</span>
        </div>
        <div className="report-grid">
          {salas.map((sala) => (
            <article className="report-item" key={sala.id}>
              <div className="report-item-top">
                <span>{sala.nome}</span>
                <strong>{contagemPorSala[sala.id] || 0}</strong>
              </div>
              <div className="meter" aria-hidden="true">
                <span style={{ width: `${Math.min((contagemPorSala[sala.id] || 0) * 18, 100)}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
