import { useMemo, useState } from "react";
import {
  UserPlus,
  Search,
  X,
  Mail,
  ShieldCheck,
  RotateCw,
  Ban,
  CheckCircle2,
  KeyRound,
  Archive,
  ArchiveRestore,
  Trash2,
  Pencil,
  Plus,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  UserStatusBadge,
  RoleStatusBadge,
} from "@/components/shared/status-badge";
import { AuditLogTable } from "@/components/shared/audit-log-table";
import { EmptyState } from "@/components/shared/empty-state";
import { initials, cn } from "@/lib/utils";
import { useCrmStore } from "@/store/crmStore";
import { useAuthStore } from "@/store/authStore";
import { navItems } from "@/lib/nav";
import type { User, RoleDefinition } from "@/types";

const emptyInviteForm = { name: "", email: "", title: "", role: "" };
const emptyRoleForm = { label: "", description: "", modules: [] as string[] };

function formatDateTime(ts?: string) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Settings() {
  const {
    users,
    roles,
    auditLog,
    inviteUser,
    resendInvite,
    updateUserRole,
    suspendUser,
    activateUser,
    archiveUser,
    restoreUser,
    deleteUser,
    sendPasswordReset,
    addRole,
    updateRole,
    archiveRole,
    restoreRole,
    deleteRole,
  } = useCrmStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  const activeRoles = useMemo(
    () => roles.filter((r) => r.status === "active"),
    [roles],
  );
  const roleLabel = (id: string) => roles.find((r) => r.id === id)?.label ?? id;

  // ---------- Users tab state ----------
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(emptyInviteForm);
  const [emailPreview, setEmailPreview] = useState<{
    user: User;
    kind: "invite" | "reset";
  } | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    user: User;
    newRoleId: string;
  } | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);

  const userAuditEntries = useMemo(
    () => auditLog.filter((e) => e.module === "user"),
    [auditLog],
  );

  const filteredUsers = useMemo(() => {
    const q = query.toLowerCase().trim();
    return users.filter((u) => {
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, query, roleFilter]);

  const hasActiveUserFilters = query.trim() !== "" || roleFilter !== "all";

  function openInvite() {
    setInviteForm({ ...emptyInviteForm, role: activeRoles[0]?.id ?? "" });
    setInviteOpen(true);
  }

  function handleInvite() {
    if (
      !inviteForm.name ||
      !inviteForm.email ||
      !inviteForm.title ||
      !inviteForm.role
    )
      return;
    inviteUser(inviteForm);
    const sent =
      useCrmStore.getState().users.find((u) => u.email === inviteForm.email) ??
      null;
    setInviteOpen(false);
    if (sent) setEmailPreview({ user: sent, kind: "invite" });
  }

  function handleResendInvite(user: User) {
    resendInvite(user.id);
    setEmailPreview({ user, kind: "invite" });
  }

  function handleSendReset(user: User) {
    sendPasswordReset(user.id);
    setEmailPreview({ user, kind: "reset" });
  }

  function confirmRoleChange() {
    if (!roleChangeTarget) return;
    const { user, newRoleId } = roleChangeTarget;
    updateUserRole(user.id, newRoleId);
    setRoleChangeTarget(null);
    if (currentUser && user.id === currentUser.id) logout();
  }

  function confirmDeleteUser() {
    if (!deleteUserTarget) return;
    deleteUser(deleteUserTarget.id);
    setDeleteUserTarget(null);
  }

  // ---------- Roles tab state ----------
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [roleEditing, setRoleEditing] = useState<RoleDefinition | null>(null);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [deleteRoleTarget, setDeleteRoleTarget] =
    useState<RoleDefinition | null>(null);
  const [roleBlockedMessage, setRoleBlockedMessage] = useState<string | null>(
    null,
  );

  const roleAuditEntries = useMemo(
    () => auditLog.filter((e) => e.module === "role"),
    [auditLog],
  );

  function userCountForRole(roleId: string) {
    return users.filter((u) => u.role === roleId && u.status !== "archived")
      .length;
  }

  function openAddRole() {
    setRoleEditing(null);
    setRoleForm(emptyRoleForm);
    setRoleFormOpen(true);
  }

  function openEditRole(role: RoleDefinition) {
    setRoleEditing(role);
    setRoleForm({
      label: role.label,
      description: role.description,
      modules: role.modules,
    });
    setRoleFormOpen(true);
  }

  function toggleModule(path: string) {
    setRoleForm((f) => ({
      ...f,
      modules: f.modules.includes(path)
        ? f.modules.filter((m) => m !== path)
        : [...f.modules, path],
    }));
  }

  function handleSaveRole() {
    if (!roleForm.label.trim()) return;
    if (roleEditing) {
      updateRole(roleEditing.id, roleForm);
    } else {
      addRole(roleForm);
    }
    setRoleFormOpen(false);
  }

  function handleArchiveRole(role: RoleDefinition) {
    const ok = archiveRole(role.id);
    if (!ok) {
      setRoleBlockedMessage(
        `"${role.label}" is still assigned to ${userCountForRole(role.id)} user(s). Reassign them to another role before archiving.`,
      );
    }
  }

  function handleDeleteRole() {
    if (!deleteRoleTarget) return;
    const ok = deleteRole(deleteRoleTarget.id);
    setDeleteRoleTarget(null);
    if (!ok) {
      setRoleBlockedMessage(
        `"${deleteRoleTarget.label}" is still referenced by at least one user account and can't be deleted.`,
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage user accounts and role-based access."
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        {/* ---------------- Users tab ---------------- */}
        <TabsContent value="users" className="space-y-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email..."
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveUserFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setRoleFilter("all");
                  }}
                  className="text-ink-500"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
            <Button variant="brand" onClick={openInvite}>
              <UserPlus className="h-4 w-4" /> Invite User
            </Button>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No users match your filters"
              description="Try a different search term or clear filters."
            />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    const archived = user.status === "archived";
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className={user.avatarColor}>
                                {initials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-ink-800">
                                {user.name}
                                {isSelf && (
                                  <span className="ml-1.5 text-xs font-normal text-ink-400">
                                    (You)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-ink-500">
                                {user.email} · {user.title}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            disabled={archived}
                            onValueChange={(newRoleId) => {
                              if (newRoleId === user.role) return;
                              setRoleChangeTarget({ user, newRoleId });
                            }}
                          >
                            <SelectTrigger className="w-full min-w-56 sm:w-64">
                              <SelectValue>{roleLabel(user.role)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {activeRoles.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.label}
                                </SelectItem>
                              ))}
                              {!activeRoles.some((r) => r.id === user.role) && (
                                <SelectItem value={user.role}>
                                  {roleLabel(user.role)} (archived)
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <UserStatusBadge status={user.status} />
                          {user.status === "invited" && (
                            <p className="mt-1 text-xs text-ink-400">
                              Sent {formatDateTime(user.invitedAt)}
                            </p>
                          )}
                          {user.passwordResetAt &&
                            user.status !== "invited" && (
                              <p className="mt-1 text-xs text-ink-400">
                                Reset sent{" "}
                                {formatDateTime(user.passwordResetAt)}
                              </p>
                            )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-ink-500"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {user.status === "invited" && (
                                  <DropdownMenuItem
                                    onClick={() => handleResendInvite(user)}
                                  >
                                    <RotateCw className="h-3.5 w-3.5" /> Resend
                                    confirmation email
                                  </DropdownMenuItem>
                                )}
                                {(user.status === "active" ||
                                  user.status === "suspended") && (
                                  <DropdownMenuItem
                                    onClick={() => handleSendReset(user)}
                                  >
                                    <KeyRound className="h-3.5 w-3.5" /> Reset
                                    password
                                  </DropdownMenuItem>
                                )}
                                {user.status === "active" && !isSelf && (
                                  <DropdownMenuItem
                                    onClick={() => suspendUser(user.id)}
                                  >
                                    <Ban className="h-3.5 w-3.5" /> Suspend
                                  </DropdownMenuItem>
                                )}
                                {user.status === "suspended" && (
                                  <DropdownMenuItem
                                    onClick={() => activateUser(user.id)}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                    Reactivate
                                  </DropdownMenuItem>
                                )}
                                {!archived && !isSelf && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => archiveUser(user.id)}
                                      className="text-ink-600"
                                    >
                                      <Archive className="h-3.5 w-3.5" />{" "}
                                      Archive
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {archived && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => restoreUser(user.id)}
                                    >
                                      <ArchiveRestore className="h-3.5 w-3.5" />{" "}
                                      Restore
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDeleteUserTarget(user)}
                                      className="text-brand-crimson-600 focus:text-brand-crimson-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Delete
                                      permanently
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {isSelf && !archived && (
                                  <p className="px-2 py-1.5 text-xs text-ink-400">
                                    Sign out to archive your own account.
                                  </p>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}

          <div>
            <h3 className="mb-3 font-display text-sm font-semibold text-ink-800 mt-4">
              Audit Trail
            </h3>
            <AuditLogTable entries={userAuditEntries} />
          </div>
        </TabsContent>

        {/* ---------------- Roles tab ---------------- */}
        <TabsContent value="roles" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button variant="brand" onClick={openAddRole}>
              <Plus className="h-4 w-4" /> Add Role
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {roles.map((role) => {
              const modules = navItems.filter((item) =>
                role.modules.includes(item.to),
              );
              const count = userCountForRole(role.id);
              const archived = role.status === "archived";
              return (
                <Card key={role.id} className={cn(archived && "opacity-70")}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="info">{role.label}</Badge>
                      <RoleStatusBadge status={role.status} />
                    </div>
                    <CardTitle className="sr-only">{role.label}</CardTitle>
                    <CardDescription>
                      {role.description || "No description."}
                    </CardDescription>
                    <p className="text-xs text-ink-400">
                      {count} active {count === 1 ? "user" : "users"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                        <ShieldCheck className="h-3.5 w-3.5" /> Module access
                      </p>
                      {modules.length === 0 ? (
                        <p className="text-sm text-ink-400">
                          No modules assigned.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {modules.map((m) => (
                            <li
                              key={m.to}
                              className="flex items-center gap-2 text-sm text-ink-600"
                            >
                              <m.icon className="h-3.5 w-3.5 text-ink-300" />{" "}
                              {m.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditRole(role)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {archived ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-brand-green-600"
                            onClick={() => restoreRole(role.id)}
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-brand-crimson-600"
                            onClick={() => setDeleteRoleTarget(role)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-ink-500"
                          onClick={() => handleArchiveRole(role)}
                        >
                          <Archive className="h-3.5 w-3.5" /> Archive
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div>
            <h3 className="mb-3 font-display text-sm font-semibold text-ink-800 mt-4">
              Audit Trail
            </h3>
            <AuditLogTable entries={roleAuditEntries} />
          </div>
        </TabsContent>
      </Tabs>

      {/* ---------------- Invite user dialog ---------------- */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a user</DialogTitle>
            <DialogDescription>
              They'll receive an email with a link to set their own password.
              The account is created immediately with "Invited" status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, name: e.target.value })
                }
                placeholder="Juan Dela Cruz"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email address</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
                placeholder="name@gmiccares.ph"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={inviteForm.title}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, title: e.target.value })
                }
                placeholder="Sales Associate"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {activeRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleInvite}>
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Mock email preview (invite / reset) ---------------- */}
      <Dialog
        open={!!emailPreview}
        onOpenChange={(v) => !v && setEmailPreview(null)}
      >
        <DialogContent>
          {emailPreview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-brand-green-500" />
                  {emailPreview.kind === "invite"
                    ? "Invitation sent"
                    : "Password reset link sent"}
                </DialogTitle>
                <DialogDescription>
                  {emailPreview.kind === "invite"
                    ? 'A password-setup link was sent to the address below. The account stays in "Invited" status until they complete it.'
                    : "A password-reset link was sent to the address below."}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-ink-100 bg-ink-50/60 p-4 text-sm">
                <div className="flex items-center gap-2 text-ink-500">
                  <Mail className="h-4 w-4" /> To: {emailPreview.user.email}
                </div>
                <p className="mt-2 font-medium text-ink-800">
                  {emailPreview.kind === "invite"
                    ? "Set up your GMIC CRM account"
                    : "Reset your GMIC CRM password"}
                </p>
                <p className="mt-1 text-ink-600">
                  Hi {emailPreview.user.name.split(" ")[0]},{" "}
                  {emailPreview.kind === "invite" ? (
                    <>
                      an administrator created a{" "}
                      {roleLabel(emailPreview.user.role)} account for you. Click
                      the link below to choose your password and sign in.
                    </>
                  ) : (
                    <>
                      click the link below to set a new password for your
                      account.
                    </>
                  )}
                </p>
                <p className="mt-2 truncate text-xs text-brand-blue-600">
                  https://gmic-crm.app/
                  {emailPreview.kind === "invite"
                    ? "set-password"
                    : "reset-password"}
                  ?token=mock-{emailPreview.user.id}-{Date.now()}
                </p>
              </div>
              <DialogFooter>
                <Button variant="brand" onClick={() => setEmailPreview(null)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- Role change confirmation ---------------- */}
      <Dialog
        open={!!roleChangeTarget}
        onOpenChange={(v) => !v && setRoleChangeTarget(null)}
      >
        <DialogContent>
          {roleChangeTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" /> Change
                  this user's role?
                </DialogTitle>
                <DialogDescription>
                  {roleChangeTarget.user.name}'s role will change from{" "}
                  <span className="font-medium text-ink-700">
                    {roleLabel(roleChangeTarget.user.role)}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-ink-700">
                    {roleLabel(roleChangeTarget.newRoleId)}
                  </span>
                  .
                  {currentUser?.id === roleChangeTarget.user.id
                    ? " You'll be signed out immediately to apply the change."
                    : " They'll be signed out of their current session and will need to log in again for the change to take effect."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRoleChangeTarget(null)}
                >
                  Cancel
                </Button>
                <Button variant="brand" onClick={confirmRoleChange}>
                  Confirm change
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- Delete user confirmation ---------------- */}
      <Dialog
        open={!!deleteUserTarget}
        onOpenChange={(v) => !v && setDeleteUserTarget(null)}
      >
        <DialogContent>
          {deleteUserTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-brand-crimson-500" />{" "}
                  Delete {deleteUserTarget.name}?
                </DialogTitle>
                <DialogDescription>
                  This permanently removes the account and can't be undone.
                  Their past activity and audit history will remain on record.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteUserTarget(null)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDeleteUser}>
                  Delete permanently
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- Add / edit role ---------------- */}
      <Dialog open={roleFormOpen} onOpenChange={setRoleFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleEditing ? "Edit role" : "Add role"}</DialogTitle>
            <DialogDescription>
              {roleEditing
                ? "Update the name, description, or module access for this role."
                : "Create a role and choose which modules it can access."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Role name</Label>
              <Input
                value={roleForm.label}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, label: e.target.value })
                }
                placeholder="e.g. Client Support"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, description: e.target.value })
                }
                placeholder="What this role is for"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Module access</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-ink-100 p-3">
                {navItems.map((item) => (
                  <label
                    key={item.to}
                    className="flex cursor-pointer items-center gap-2 text-sm text-ink-700"
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400"
                      checked={roleForm.modules.includes(item.to)}
                      onChange={() => toggleModule(item.to)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleSaveRole}>
              {roleEditing ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Delete role confirmation ---------------- */}
      <Dialog
        open={!!deleteRoleTarget}
        onOpenChange={(v) => !v && setDeleteRoleTarget(null)}
      >
        <DialogContent>
          {deleteRoleTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-brand-crimson-500" />{" "}
                  Delete "{deleteRoleTarget.label}"?
                </DialogTitle>
                <DialogDescription>
                  This permanently removes the role and can't be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteRoleTarget(null)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteRole}>
                  Delete permanently
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- Blocked action notice ---------------- */}
      <Dialog
        open={!!roleBlockedMessage}
        onOpenChange={(v) => !v && setRoleBlockedMessage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Can't
              complete this action
            </DialogTitle>
            <DialogDescription>{roleBlockedMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="brand" onClick={() => setRoleBlockedMessage(null)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
