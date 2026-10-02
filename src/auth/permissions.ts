import { UserRole } from '../users/entities/user.entity';

export const PRODUCT_ABILITIES = [
  'view products',
  'create products',
  'update products',
  'delete products',
] as const;

/**
 * Replica `RolePermissionSeeder.php`. Solo se listan las abilities relevantes
 * para la porción vertical de Product más las de los demás recursos para
 * conservar la forma del token.
 */
export const ROLE_ABILITIES: Record<UserRole, string[]> = {
  admin: [
    ...PRODUCT_ABILITIES,
    'view sales',
    'create sales',
    'update sales',
    'delete sales',
    'view purchases',
    'create purchases',
    'update purchases',
    'delete purchases',
    'view customers',
    'create customers',
    'update customers',
    'delete customers',
    'view suppliers',
    'create suppliers',
    'update suppliers',
    'delete suppliers',
  ],
  cajero: ['view products', 'view sales', 'create sales', 'view customers'],
  bodeguero: [
    'view products',
    'create products',
    'update products',
    'view purchases',
    'create purchases',
    'view suppliers',
    'update suppliers',
  ],
};

export function abilitiesForRole(role: UserRole): string[] {
  return ROLE_ABILITIES[role] ?? [];
}
