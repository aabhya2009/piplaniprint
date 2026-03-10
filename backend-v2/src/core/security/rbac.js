import { AppError } from '../errors/app-error.js';

export function requireRole(allowedRoles = []) {
  return (ctx) => {
    const role = ctx?.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN', { allowedRoles, role });
    }
  };
}

export function requireTenantScope(ctx, tenantId) {
  if (!ctx?.user?.tenantId || ctx.user.tenantId !== tenantId) {
    throw new AppError('Cross-tenant access denied', 403, 'TENANT_SCOPE_VIOLATION');
  }
}
