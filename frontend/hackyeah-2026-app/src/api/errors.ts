export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Field errors from a 400 "Request validation failed". */
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Backend `detail` messages (English) the user may see, translated for the UI. */
const KNOWN_MESSAGES: Record<string, string> = {
  'Help request is no longer open': 'Ktoś inny zgłosił się już do pomocy.',
  'Volunteer already has an active help request':
    'Masz już aktywne zadanie. Zakończ je, zanim zgłosisz się do kolejnego.',
  'Help request has no pending offer': 'Ta oferta pomocy nie jest już aktualna.',
  'Help request is not in progress': 'To zadanie nie jest już w toku.',
  'QR code was already used': 'Ten kod QR został już użyty.',
  'Invalid QR code': 'Kod QR nie pasuje do tego zgłoszenia.',
  'QR code expired, ask the requester to show it again':
    'Kod QR wygasł. Poproś o ponowne wyświetlenie kodu.',
  'You have already rated this help request': 'Ta pomoc została już przez Ciebie oceniona.',
  'Only completed help requests can be rated': 'Ocenić można tylko zakończoną pomoc.',
  'Only volunteers can offer help': 'Pomoc mogą zgłaszać tylko wolontariusze.',
  'City administrators cannot create help requests': 'Konto miasta nie może dodawać zgłoszeń.',
};

const BY_STATUS: Record<number, string> = {
  400: 'Sprawdź wpisane dane i spróbuj ponownie.',
  401: 'Sesja wygasła. Zaloguj się ponownie.',
  403: 'Nie masz uprawnień do tej akcji.',
  404: 'Nie znaleziono zgłoszenia.',
  409: 'Stan zgłoszenia zmienił się. Odśwież widok.',
};

/** Message to show in the UI for any error thrown by the API layer. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return (
      KNOWN_MESSAGES[error.message] ??
      BY_STATUS[error.status] ??
      'Coś poszło nie tak. Spróbuj ponownie.'
    );
  }
  return 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.';
}
