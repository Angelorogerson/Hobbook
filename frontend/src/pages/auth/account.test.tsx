import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const authApi = { requestPasswordReset: vi.fn(), resetPassword: vi.fn(), verifyEmail: vi.fn(), resendVerification: vi.fn() }
vi.mock('@/api/authApi', async (orig) => ({
  ...(await orig<typeof import('@/api/authApi')>()),
  requestPasswordReset: (...a: unknown[]) => authApi.requestPasswordReset(...a),
  resetPassword: (...a: unknown[]) => authApi.resetPassword(...a),
  verifyEmail: (...a: unknown[]) => authApi.verifyEmail(...a),
  resendVerification: (...a: unknown[]) => authApi.resendVerification(...a),
}))

type TestUser = { _id: string; name: string; email: string; role: 'user'; emailVerified?: boolean }
const auth = {
  state: { isLoading: false, isLoggedIn: false, user: null as TestUser | null, token: null as string | null },
  login: vi.fn(),
  setSession: vi.fn(),
  refreshUser: vi.fn(),
}
vi.mock('@/store/AuthContext', () => ({
  useAuthContext: () => ({ authState: auth.state, login: auth.login, setSession: auth.setSession, refreshUser: auth.refreshUser }),
}))

import ForgotPasswordPage from './ForgotPasswordPage'
import ResetPasswordPage from './ResetPasswordPage'
import VerifyEmailPage from './VerifyEmailPage'
import LoginPage from './LoginPage'
import EmailVerifyNotice from '@/components/account/EmailVerifyNotice'

const TOKEN = 'ab12'.repeat(16)
const paula: TestUser = { _id: 'u1', name: 'Paula Neu', email: 'paula@hobbook.test', role: 'user', emailVerified: false }

/** An error shaped like the ones axios produces for an API answer. */
const apiFailure = (status: number, data: { message: string; errors?: Record<string, string> }) =>
  Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status, data } })

function signIn(user: TestUser | null) {
  auth.state = { isLoading: false, isLoggedIn: !!user, user, token: user ? 'session' : null }
}

function openAt(path: string, strict = false) {
  const tree = (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Startseite</p>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profil" element={<p>Profilseite</p>} />
        <Route path="/passwort-vergessen" element={<ForgotPasswordPage />} />
        <Route path="/passwort-neu/:token" element={<ResetPasswordPage />} />
        <Route path="/email-bestaetigen/:token" element={<VerifyEmailPage />} />
      </Routes>
    </MemoryRouter>
  )
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

beforeEach(() => {
  ;[...Object.values(authApi), auth.login, auth.setSession, auth.refreshUser].forEach((f) => f.mockReset())
  auth.refreshUser.mockResolvedValue(undefined)
  signIn(null)
})

describe('login page', () => {
  it('links to the forgot page and takes the typed address along', async () => {
    const user = userEvent.setup()
    openAt('/login')
    await user.type(screen.getByLabelText('E-Mail'), 'paula@hobbook.test')
    await user.click(screen.getByRole('link', { name: 'Passwort vergessen?' }))
    expect(screen.getByRole('heading', { name: 'Passwort vergessen?' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-Mail')).toHaveValue('paula@hobbook.test')
  })
})

describe('forgot password page', () => {
  it('shows one neutral confirmation after sending', async () => {
    const user = userEvent.setup()
    authApi.requestPasswordReset.mockResolvedValue('ok')
    openAt('/passwort-vergessen')

    await user.type(screen.getByLabelText('E-Mail'), '  paula@hobbook.test ')
    await user.click(screen.getByRole('button', { name: 'Link senden' }))

    const status = await screen.findByRole('status')
    expect(authApi.requestPasswordReset).toHaveBeenCalledTimes(1)
    expect(authApi.requestPasswordReset).toHaveBeenCalledWith('paula@hobbook.test')
    // Neutral: "if there is an account", never "we found your account".
    expect(status).toHaveTextContent('Wenn es ein Konto mit paula@hobbook.test gibt, haben wir dir einen Link geschickt.')
    expect(screen.getByRole('heading', { name: 'Schau in dein Postfach' })).toHaveFocus()
    expect(screen.queryByLabelText('E-Mail')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zur Anmeldung' })).toHaveAttribute('href', '/login')

    await user.click(screen.getByRole('button', { name: 'Andere Adresse eingeben' }))
    // Back in the form, the address is still there to correct.
    expect(screen.getByLabelText('E-Mail')).toHaveValue('paula@hobbook.test')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('checks the address before sending and shows server problems', async () => {
    const user = userEvent.setup()
    openAt('/passwort-vergessen')

    await user.type(screen.getByLabelText('E-Mail'), 'keine-adresse')
    await user.click(screen.getByRole('button', { name: 'Link senden' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Bitte gib eine gültige E-Mail-Adresse ein.')
    expect(screen.getByLabelText('E-Mail')).toHaveAttribute('aria-invalid', 'true')
    expect(authApi.requestPasswordReset).not.toHaveBeenCalled()

    authApi.requestPasswordReset.mockRejectedValue(apiFailure(429, { message: 'Zu viele Anmeldeversuche. Bitte versuche es später erneut.' }))
    await user.clear(screen.getByLabelText('E-Mail'))
    await user.type(screen.getByLabelText('E-Mail'), 'paula@hobbook.test')
    await user.click(screen.getByRole('button', { name: 'Link senden' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Anmeldeversuche')
    expect(screen.getByRole('button', { name: 'Link senden' })).toBeEnabled()
  })
})

describe('reset password page', () => {
  it('shows inline errors for a short password and for a mismatch, without calling the API', async () => {
    const user = userEvent.setup()
    openAt(`/passwort-neu/${TOKEN}`)

    await user.type(screen.getByLabelText('Neues Passwort'), 'kurz')
    await user.type(screen.getByLabelText('Passwort wiederholen'), 'kurz')
    await user.click(screen.getByRole('button', { name: 'Passwort speichern' }))
    expect(screen.getByText('Das Passwort muss mindestens 8 Zeichen haben.')).toBeInTheDocument()
    expect(screen.getByLabelText('Neues Passwort')).toHaveAttribute('aria-invalid', 'true')

    await user.clear(screen.getByLabelText('Neues Passwort'))
    await user.type(screen.getByLabelText('Neues Passwort'), 'lang-genug-1')
    await user.clear(screen.getByLabelText('Passwort wiederholen'))
    await user.type(screen.getByLabelText('Passwort wiederholen'), 'lang-genug-2')
    await user.click(screen.getByRole('button', { name: 'Passwort speichern' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Die Passwörter stimmen nicht überein.')
    expect(screen.getByLabelText('Passwort wiederholen')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('Das Passwort muss mindestens 8 Zeichen haben.')).not.toBeInTheDocument()

    expect(authApi.resetPassword).not.toHaveBeenCalled()
  })

  it('saves the new password, signs the person in and goes to the start page', async () => {
    const user = userEvent.setup()
    const session = { token: 'new-session', user: { ...paula, emailVerified: true } }
    authApi.resetPassword.mockResolvedValue(session)
    openAt(`/passwort-neu/${TOKEN}`)

    await user.type(screen.getByLabelText('Neues Passwort'), 'lang-genug-1')
    await user.type(screen.getByLabelText('Passwort wiederholen'), 'lang-genug-1')
    await user.click(screen.getByRole('button', { name: 'Passwort speichern' }))

    // A short "done" moment, then the start page
    expect(await screen.findByRole('heading', { name: 'Passwort gespeichert' })).toBeInTheDocument()
    expect(await screen.findByText('Startseite', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(authApi.resetPassword).toHaveBeenCalledTimes(1)
    expect(authApi.resetPassword).toHaveBeenCalledWith(TOKEN, 'lang-genug-1')
    expect(auth.setSession).toHaveBeenCalledWith('new-session', session.user)
  })

  it('explains an expired or used link and offers a new one', async () => {
    const user = userEvent.setup()
    const message = 'Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.'
    authApi.resetPassword.mockRejectedValue(apiFailure(400, { message, errors: { token: message } }))
    openAt(`/passwort-neu/${TOKEN}`)

    await user.type(screen.getByLabelText('Neues Passwort'), 'lang-genug-1')
    await user.type(screen.getByLabelText('Passwort wiederholen'), 'lang-genug-1')
    await user.click(screen.getByRole('button', { name: 'Passwort speichern' }))

    expect(await screen.findByRole('heading', { name: 'Dieser Link gilt nicht mehr' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('ungültig, abgelaufen oder wurde schon benutzt')
    expect(screen.getByRole('link', { name: 'Neuen Link anfordern' })).toHaveAttribute('href', '/passwort-vergessen')
    expect(screen.queryByLabelText('Neues Passwort')).not.toBeInTheDocument()
    expect(auth.setSession).not.toHaveBeenCalled()
  })

  it('keeps the form and shows the message for other problems (e.g. a blocked account)', async () => {
    const user = userEvent.setup()
    authApi.resetPassword.mockRejectedValue(apiFailure(403, { message: 'Dieses Konto ist gesperrt.' }))
    openAt(`/passwort-neu/${TOKEN}`)

    await user.type(screen.getByLabelText('Neues Passwort'), 'lang-genug-1')
    await user.type(screen.getByLabelText('Passwort wiederholen'), 'lang-genug-1')
    await user.click(screen.getByRole('button', { name: 'Passwort speichern' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Dieses Konto ist gesperrt.')
    expect(screen.getByRole('button', { name: 'Passwort speichern' })).toBeEnabled()
  })

  it('does not show a form for a link that cannot be valid', () => {
    openAt('/passwort-neu/kaputt')
    expect(screen.getByRole('heading', { name: 'Dieser Link gilt nicht mehr' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Neuen Link anfordern' })).toBeInTheDocument()
  })
})

describe('verify email page', () => {
  it('confirms exactly once (also under StrictMode) and refreshes the signed-in account', async () => {
    signIn(paula)
    let finish: (v: { message: string; alreadyVerified: boolean }) => void = () => {}
    authApi.verifyEmail.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    openAt(`/email-bestaetigen/${TOKEN}`, true)

    expect(screen.getByText('Deine E-Mail-Adresse wird bestätigt …')).toBeInTheDocument()
    expect(auth.refreshUser).not.toHaveBeenCalled()
    finish({ message: 'ok', alreadyVerified: false })

    expect(await screen.findByRole('heading', { name: 'Bestätigt' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Deine E-Mail-Adresse ist bestätigt.')
    expect(authApi.verifyEmail).toHaveBeenCalledTimes(1)
    expect(authApi.verifyEmail).toHaveBeenCalledWith(TOKEN)
    await waitFor(() => expect(auth.refreshUser).toHaveBeenCalledTimes(1))
  })

  it('treats an already confirmed address as success and does not reload anything for guests', async () => {
    authApi.verifyEmail.mockResolvedValue({ message: 'ok', alreadyVerified: true })
    openAt(`/email-bestaetigen/${TOKEN}`)
    // (The spinner is a status too, so wait for the result heading first.)
    expect(await screen.findByRole('heading', { name: 'Bestätigt' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Deine E-Mail-Adresse ist schon bestätigt.')
    expect(auth.refreshUser).not.toHaveBeenCalled()
  })

  it('explains a dead link and points the signed-in person to the profile', async () => {
    signIn(paula)
    const message = 'Dieser Link ist ungültig, abgelaufen oder wurde schon benutzt.'
    authApi.verifyEmail.mockRejectedValue(apiFailure(400, { message, errors: { token: message } }))
    openAt(`/email-bestaetigen/${TOKEN}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('ungültig, abgelaufen oder wurde schon benutzt')
    expect(screen.getByRole('link', { name: 'Zum Profil' })).toHaveAttribute('href', '/profil')
    expect(auth.refreshUser).not.toHaveBeenCalled()
  })

  it('sends guests to sign in first, and never calls the API for a link that cannot be valid', () => {
    openAt('/email-bestaetigen/kaputt')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anmelden' })).toHaveAttribute('href', '/login')
    expect(authApi.verifyEmail).not.toHaveBeenCalled()
  })
})

describe('email hint in the profile', () => {
  const show = () =>
    render(
      <MemoryRouter>
        <EmailVerifyNotice />
      </MemoryRouter>
    )

  it('renders nothing when confirmed, unknown or signed out', () => {
    for (const user of [null, { ...paula, emailVerified: true }, { ...paula, emailVerified: undefined }]) {
      signIn(user)
      const { container, unmount } = show()
      expect(container).toBeEmptyDOMElement()
      unmount()
    }
  })

  it('sends a new link: busy, then a confirmation', async () => {
    const user = userEvent.setup()
    signIn(paula)
    let finish: (v: { message: string; emailVerified: boolean }) => void = () => {}
    authApi.resendVerification.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    show()

    expect(screen.getByText('Deine E-Mail-Adresse ist noch nicht bestätigt.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Link erneut senden' }))
    expect(screen.getByRole('button', { name: 'Wird gesendet …' })).toBeDisabled()

    finish({ message: 'ok', emailVerified: false })
    expect(await screen.findByRole('status')).toHaveTextContent('Neuer Link ist unterwegs.')
    expect(screen.getByRole('button', { name: 'Link erneut senden' })).toBeEnabled()
    expect(authApi.resendVerification).toHaveBeenCalledTimes(1)
  })

  it('shows an error and lets the person try again', async () => {
    const user = userEvent.setup()
    signIn(paula)
    authApi.resendVerification.mockRejectedValue(apiFailure(503, { message: 'Die E-Mail konnte gerade nicht gesendet werden.' }))
    show()

    await user.click(screen.getByRole('button', { name: 'Link erneut senden' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Die E-Mail konnte gerade nicht gesendet werden.')
    expect(screen.getByRole('button', { name: 'Link erneut senden' })).toBeEnabled()
  })

  it('reloads the account when the address was confirmed in the meantime', async () => {
    const user = userEvent.setup()
    signIn(paula)
    authApi.resendVerification.mockResolvedValue({ message: 'schon bestätigt', emailVerified: true })
    show()

    await user.click(screen.getByRole('button', { name: 'Link erneut senden' }))
    await waitFor(() => expect(auth.refreshUser).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
