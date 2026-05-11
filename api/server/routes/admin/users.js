const express = require('express');
const { createAdminUsersHandlers, checkEmailConfig, createInvite } = require('@librechat/api');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');
const { sendEmail } = require('~/server/utils');
const db = require('~/models');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);
const requireReadUsers = requireCapability(SystemCapabilities.READ_USERS);
const requireManageUsers = requireCapability(SystemCapabilities.MANAGE_USERS);

const handlers = createAdminUsersHandlers({
  findUsers: db.findUsers,
  countUsers: db.countUsers,
  deleteUserById: db.deleteUserById,
  deleteConfig: db.deleteConfig,
  deleteAclEntries: db.deleteAclEntries,
});

router.use(requireJwtAuth, requireAdminAccess);

router.get('/', requireReadUsers, handlers.listUsers);
router.get('/search', requireReadUsers, handlers.searchUsers);
router.delete('/:id', requireManageUsers, handlers.deleteUser);

router.post('/invite', requireManageUsers, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }

  const existing = await db.findUser({ email });
  if (existing) {
    return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
  }

  const token = await createInvite(email, {
    createToken: db.createToken,
    findToken: db.findToken,
  });

  if (!token || typeof token === 'object') {
    return res.status(500).json({ error: "Impossible de créer l'invitation" });
  }

  const appName = process.env.APP_TITLE || 'LibreChat';
  const inviteLink = `${process.env.DOMAIN_CLIENT}/register?token=${token}`;

  if (checkEmailConfig()) {
    try {
      await sendEmail({
        email,
        subject: `Invitation à rejoindre ${appName}`,
        payload: { appName, inviteLink, year: new Date().getFullYear() },
        template: 'inviteUser.handlebars',
      });
    } catch (err) {
      return res.status(500).json({ error: "Erreur lors de l'envoi de l'email" });
    }
  }

  return res.json({ message: 'Invitation envoyée', inviteLink });
});

module.exports = router;
