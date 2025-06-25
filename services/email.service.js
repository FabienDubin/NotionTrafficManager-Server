const Mailjet = require("node-mailjet");

class EmailService {
  constructor() {
    this.mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    );
  }

  /**
   * Envoie un email de notification pour un nouveau bug report
   * @param {Object} bugReport - Le bug report créé
   * @param {string} adminEmail - Email de l'administrateur
   */
  async sendBugReportNotification(bugReport, adminEmail) {
    try {
      const emailData = {
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER,
              Name: process.env.MAILJET_NAME || "NotionTrafficManager",
            },
            To: [
              {
                Email: adminEmail,
                Name: "Administrateur",
              },
            ],
            Subject: `🐛 Nouveau Bug Report: ${bugReport.title}`,
            HTMLPart: this.generateBugReportEmailTemplate(bugReport),
            TextPart: this.generateBugReportTextTemplate(bugReport),
          },
        ],
      };

      const result = await this.mailjet
        .post("send", { version: "v3.1" })
        .request(emailData);

      console.log("Email de bug report envoyé avec succès:", result.body);
      return { success: true, messageId: result.body.Messages[0].MessageID };
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de bug report:", error);
      throw new Error("Impossible d'envoyer l'email de notification");
    }
  }

  /**
   * Génère le template HTML pour l'email de bug report
   * @param {Object} bugReport - Le bug report
   * @returns {string} Template HTML
   */
  generateBugReportEmailTemplate(bugReport) {
    const screenshotsHtml =
      bugReport.screenshots.length > 0
        ? `
        <div style="margin: 20px 0;">
          <h3 style="color: #374151; margin-bottom: 10px;">📸 Screenshots:</h3>
          ${bugReport.screenshots
            .map(
              (url) => `
            <div style="margin: 10px 0;">
              <a href="${url}" target="_blank" style="color: #3b82f6; text-decoration: none;">
                <img src="${url}" alt="Screenshot" style="max-width: 300px; max-height: 200px; border: 1px solid #e5e7eb; border-radius: 8px; display: block; margin: 5px 0;">
              </a>
            </div>
          `
            )
            .join("")}
        </div>
      `
        : '<p style="color: #6b7280; font-style: italic;">Aucun screenshot fourni</p>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouveau Bug Report</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🐛 Nouveau Bug Report</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">NotionTrafficManager</p>
        </div>

        <div style="background: #f9fafb; padding: 25px; border-radius: 12px; border-left: 4px solid #ef4444; margin-bottom: 25px;">
          <h2 style="color: #ef4444; margin: 0 0 15px 0; font-size: 22px;">${
            bugReport.title
          }</h2>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${
              bugReport.description
            }</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0;">
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">📊 Priorité</h3>
            <span style="background: ${this.getPriorityColor(
              bugReport.priority
            )}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500;">
              ${bugReport.priorityLabel}
            </span>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">🔄 Statut</h3>
            <span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500;">
              ${bugReport.statusLabel}
            </span>
          </div>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 25px 0;">
          <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">👤 Informations utilisateur</h3>
          <div style="display: grid; gap: 10px;">
            <div><strong>Nom:</strong> ${bugReport.userInfo.name}</div>
            <div><strong>Email:</strong> <a href="mailto:${
              bugReport.userInfo.email
            }" style="color: #3b82f6;">${bugReport.userInfo.email}</a></div>
            <div><strong>Page:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${
              bugReport.userInfo.currentUrl || "Non spécifiée"
            }</code></div>
            <div><strong>Navigateur:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${
              bugReport.userInfo.userAgent || "Non spécifié"
            }</code></div>
            <div><strong>Date:</strong> ${new Date(
              bugReport.createdAt
            ).toLocaleString("fr-FR")}</div>
          </div>
        </div>

        ${screenshotsHtml}

        <div style="background: #1f2937; color: white; padding: 25px; border-radius: 12px; text-align: center; margin-top: 30px;">
          <p style="margin: 0 0 15px 0; font-size: 16px;">Accédez au dashboard admin pour gérer ce bug report</p>
          <a href="${process.env.ORIGIN || "http://localhost:5173"}/dashboard" 
             style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; display: inline-block;">
            🔧 Ouvrir le Dashboard
          </a>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p>NotionTrafficManager - Système de gestion de bugs</p>
        </div>

      </body>
      </html>
    `;
  }

  /**
   * Génère le template texte pour l'email de bug report
   * @param {Object} bugReport - Le bug report
   * @returns {string} Template texte
   */
  generateBugReportTextTemplate(bugReport) {
    const screenshotsText =
      bugReport.screenshots.length > 0
        ? `\n\nScreenshots:\n${bugReport.screenshots
            .map((url) => `- ${url}`)
            .join("\n")}`
        : "\n\nAucun screenshot fourni";

    return `
🐛 NOUVEAU BUG REPORT - NotionTrafficManager

Titre: ${bugReport.title}

Description:
${bugReport.description}

Priorité: ${bugReport.priorityLabel}
Statut: ${bugReport.statusLabel}

Informations utilisateur:
- Nom: ${bugReport.userInfo.name}
- Email: ${bugReport.userInfo.email}
- Page: ${bugReport.userInfo.currentUrl || "Non spécifiée"}
- Navigateur: ${bugReport.userInfo.userAgent || "Non spécifié"}
- Date: ${new Date(bugReport.createdAt).toLocaleString("fr-FR")}
${screenshotsText}

Accédez au dashboard admin pour gérer ce bug report:
${process.env.ORIGIN || "http://localhost:5173"}/dashboard

---
NotionTrafficManager - Système de gestion de bugs
    `;
  }

  /**
   * Retourne la couleur associée à une priorité
   * @param {string} priority - La priorité
   * @returns {string} Code couleur hexadécimal
   */
  getPriorityColor(priority) {
    const colors = {
      low: "#10b981", // vert
      medium: "#f59e0b", // orange
      high: "#ef4444", // rouge
      critical: "#7c2d12", // rouge foncé
    };
    return colors[priority] || "#6b7280";
  }
}

module.exports = new EmailService();
