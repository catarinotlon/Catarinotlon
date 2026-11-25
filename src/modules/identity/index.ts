export type { CurrentUser, CurrentUserProvider } from './application/ports/current-user-provider';
export type { HumanVerifier } from './application/ports/human-verifier';
export type {
  ErasureRequest,
  ManualRegistrationEraser,
  PersonalDataEraser,
  RegistrationErasureRequest,
} from './application/ports/personal-data-eraser';
export { eraseAccountData } from './application/use-cases/erase-account-data';
export {
  eraseManualRegistration,
  type RegistrationNotErasable,
} from './application/use-cases/erase-manual-registration';
export {
  requireAdmin,
  requireUser,
  type NotAdmin,
  type NotSignedIn,
} from './application/use-cases/require-user';
export type { AdminGrantRepository } from './application/ports/admin-grant-repository';
export {
  adminEmailList,
  grantAdmin,
  requireOwner,
  revokeAdmin,
  type AdminNotFound,
  type AdminTeamDeps,
  type AlreadyAdmin,
  type NotOwner,
} from './application/use-cases/admin-team';
export type { AdminGrant, InvalidEmail } from './domain/admin-grant';
export { isAdmin, parseAdminEmails } from './domain/admin-policy';
export { PRIVACY_VERSION, TERMS_VERSION } from './presentation/legal-versions';
