"use client";

import React, { createContext, useContext, useState } from "react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  availableRoles: Role[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const AVAILABLE_ROLES: Role[] = [
  Role.ADMIN,
  Role.CSR,
  Role.DRAFTER,
  Role.FIELD_WORKER,
  Role.SIGNING_SURVEYOR,
  Role.MARKETER,
];

export function RoleContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRoleState] = useState<Role>(Role.ADMIN);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        availableRoles: AVAILABLE_ROLES,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  const { data: session } = useSession();

  if (session?.user?.role) {
    return {
      role: session.user.role as Role,
      setRole: (r: Role) => {},
      availableRoles: AVAILABLE_ROLES,
    };
  }

  if (context) return context;

  return {
    role: Role.CSR,
    setRole: (r: Role) => {},
    availableRoles: AVAILABLE_ROLES,
  };
}
