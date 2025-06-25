const { BlobServiceClient } = require("@azure/storage-blob");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

// Configuration Azure Blob Storage
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

// Fonction utilitaire pour obtenir l'extension du fichier
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Fonction utilitaire pour générer un nom de fichier unique
const generateUniqueFilename = (originalname) => {
  const extension = getFileExtension(originalname);
  const uuid = uuidv4();
  return `${uuid}${extension}`;
};

// Storage personnalisé pour Azure Blob Storage
const createAzureStorage = (containerName, options = {}) => {
  return multer.memoryStorage();
};

// Middleware personnalisé pour upload vers Azure
const createAzureUploader = (containerName, options = {}) => {
  const {
    allowedFormats = ["jpg", "jpeg", "png"],
    maxSize = 5 * 1024 * 1024, // 5MB par défaut
    generateSignedUrl = false,
  } = options;

  const upload = multer({
    storage: createAzureStorage(containerName, options),
    limits: {
      fileSize: maxSize,
    },
    fileFilter: (req, file, cb) => {
      const extension = getFileExtension(file.originalname).substring(1); // Enlever le point

      if (allowedFormats.includes(extension)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Format de fichier non supporté. Formats autorisés : ${allowedFormats.join(
              ", "
            )}`
          ),
          false
        );
      }
    },
  });

  // Middleware qui gère l'upload vers Azure après multer
  const azureUploadMiddleware = async (req, res, next) => {
    try {
      // Gérer les fichiers multiples (bug reports) ou un seul fichier (profil)
      const files = req.files || (req.file ? [req.file] : []);

      if (files.length === 0) {
        return next();
      }

      // Obtenir le client du conteneur
      const containerClient =
        blobServiceClient.getContainerClient(containerName);

      // Créer le conteneur s'il n'existe pas
      await containerClient.createIfNotExists({
        access:
          containerName === process.env.AZURE_CONTAINER_PROFILE_IMAGES
            ? "blob"
            : "container",
      });

      const uploadedFiles = [];

      // Traiter chaque fichier
      for (const file of files) {
        // Générer un nom de fichier unique
        const uniqueFilename = generateUniqueFilename(file.originalname);

        // Obtenir le client du blob
        const blockBlobClient =
          containerClient.getBlockBlobClient(uniqueFilename);

        // Définir les options d'upload
        const uploadOptions = {
          blobHTTPHeaders: {
            blobContentType: file.mimetype,
          },
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          },
        };

        // Upload du fichier vers Azure Blob Storage
        await blockBlobClient.upload(
          file.buffer,
          file.buffer.length,
          uploadOptions
        );

        // Construire l'URL du fichier
        let fileUrl;
        if (generateSignedUrl) {
          // Générer une URL signée pour les conteneurs privés (bug reports)
          const sasUrl = await blockBlobClient.generateSasUrl({
            permissions: "r", // lecture seule
            expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          });
          fileUrl = sasUrl;
        } else {
          // URL publique pour les images de profil
          fileUrl = blockBlobClient.url;
        }

        // Modifier l'objet file pour maintenir la compatibilité
        file.path = fileUrl;
        file.filename = uniqueFilename;
        file.location = fileUrl;

        uploadedFiles.push(fileUrl);

        console.log(
          `Fichier uploadé avec succès vers Azure Blob Storage: ${fileUrl}`
        );
      }

      // Pour les bug reports, ajouter les URLs dans req.body.screenshots
      if (
        containerName ===
        (process.env.AZURE_CONTAINER_BUG_REPORTS || "bug-reports")
      ) {
        req.body.screenshots = uploadedFiles;
      }

      next();
    } catch (error) {
      console.error("Erreur lors de l'upload vers Azure Blob Storage:", error);
      next(error);
    }
  };

  // Retourner un middleware combiné
  return (req, res, next) => {
    // Pour les bug reports, on accepte plusieurs fichiers
    const uploadHandler =
      containerName ===
      (process.env.AZURE_CONTAINER_BUG_REPORTS || "bug-reports")
        ? upload.array("screenshots", 5) // Max 5 screenshots
        : upload.single("imageUrl");

    uploadHandler(req, res, (err) => {
      if (err) {
        return next(err);
      }
      azureUploadMiddleware(req, res, next);
    });
  };
};

// Export des middlewares spécialisés
module.exports = {
  // Middleware pour les images de profil (conteneur public)
  profileImageUploader: createAzureUploader(
    process.env.AZURE_CONTAINER_PROFILE_IMAGES || "profile-images",
    {
      allowedFormats: ["jpg", "jpeg", "png"],
      maxSize: 5 * 1024 * 1024, // 5MB
      generateSignedUrl: false, // URLs publiques
    }
  ),

  // Middleware pour les bug reports (conteneur privé) - prêt pour la prochaine tâche
  bugReportUploader: createAzureUploader(
    process.env.AZURE_CONTAINER_BUG_REPORTS || "bug-reports",
    {
      allowedFormats: ["jpg", "jpeg", "png", "webp"],
      maxSize: 10 * 1024 * 1024, // 10MB
      generateSignedUrl: true, // URLs signées pour sécurité
    }
  ),

  // Fonction utilitaire pour créer des uploaders personnalisés
  createAzureUploader,
};
