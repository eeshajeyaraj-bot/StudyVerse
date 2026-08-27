# StudyVerse security checklist

## 1. Remove the leaked `.env` from all Git history

The current branch must not contain `.env`, but removing the file from the latest commit does **not** remove old blobs from Git history.

On a fresh local clone:

```bash
git clone https://github.com/eeshajeyaraj-bot/StudyVerse.git
cd StudyVerse
git fetch --all --prune
```

Make a backup first:

```bash
git clone --mirror https://github.com/eeshajeyaraj-bot/StudyVerse.git StudyVerse-backup.git
```

### Recommended: git-filter-repo

Install `git-filter-repo`, then run from a mirror clone:

```bash
git clone --mirror https://github.com/eeshajeyaraj-bot/StudyVerse.git
cd StudyVerse.git
git filter-repo --path .env --invert-paths
```

Verify the secret file is gone from every ref:

```bash
git log --all --full-history -- .env
git rev-list --objects --all | grep -E '(^|/)\.env$'
```

Both commands should return nothing.

Force-push the rewritten refs only after checking the backup:

```bash
git push --force --mirror origin
```

Tell collaborators to re-clone or reset to the rewritten history; old clones can still contain the secret.

### BFG alternative

```bash
java -jar bfg.jar --delete-files .env StudyVerse.git
cd StudyVerse.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force --mirror origin
```

## 2. Rotate the Supabase key

Treat the exposed key as compromised even if it is an anon/public key. Rotate it in the Supabase dashboard, then update the new value in Vercel and local `.env` files. Never put the replacement key in Git.

## 3. RLS verification before considering the anon key safe

For every public table, verify:

- [ ] RLS is enabled.
- [ ] `SELECT` policies restrict rows to the authenticated user or an allowed room/friend relationship.
- [ ] `INSERT` policies force ownership fields such as `user_id`, `owner_id`, `sender_id`, or `host_id` to equal `auth.uid()` where appropriate.
- [ ] `UPDATE` policies prevent a user from changing another user's ownership fields.
- [ ] `DELETE` policies prevent deleting another user's data.
- [ ] Room membership insert/delete policies enforce who can join or remove members.
- [ ] Direct-message reads/writes require the logged-in user to be sender or recipient.
- [ ] Room messages require membership in the room.
- [ ] Notifications can only be read/updated by their recipient.
- [ ] Storage policies restrict chat files to authorized users/room participants.
- [ ] Service-role keys are never exposed to Vite/browser code.
- [ ] Database functions use `security definer` only when necessary and have a safe `search_path`.

## 4. Client-side checks are not security

UI checks such as `user.id === row.user_id` are useful for UX but do not protect data. The final authorization decision must happen in Supabase RLS policies.

## 5. Final verification

After rotation and RLS review, test with two separate accounts:

- [ ] Account A cannot read Account B's private profile data.
- [ ] Account A cannot update/delete Account B's tasks/profile/messages.
- [ ] Account A cannot read a room's messages without membership.
- [ ] Account A cannot insert a room message while pretending to be Account B.
- [ ] Account A cannot mark Account B's notifications as read.
- [ ] Account A cannot access Account B's private chat files.

Keep `.env` local only. Commit `.env.example` with blank placeholders instead.
