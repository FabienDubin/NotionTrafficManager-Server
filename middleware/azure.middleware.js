const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require("@azure/storage-blob");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

// Création du client principal à partir de la connection string
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

// Utilisé uniquement pour signer les URLs SAS
const sharedKeyCredential = new StorageSharedKeyCredential(
  process.env.AZURE_STORAGE_ACCOUNT_NAME,
  process.env.AZURE_STORAGE_ACCOUNT_KEY
);

// Récupération de l'extension du fichier
const getFileExtension = (filename) => path.extname(filename).toLowerCase();

// Génération d’un nom de fichier unique (UUID + extension)
const generateUniqueFilename = (originalname) => {
  const extension = getFileExtension(originalname);
  const uuid = uuidv4();
  return `${uuid}${extension}`;
};

// Storage en mémoire pour multer
const createAzureStorage = () => multer.memoryStorage();

// Fonction principale de création de middleware uploader
const createAzureUploader = (containerName, options = {}) => {
  const {
    allowedFormats = ["jpg", "jpeg", "png"],
    maxSize = 5 * 1024 * 1024, // Taille max en octets (par défaut : 5MB)
    generateSignedUrl = false, // true pour les containers privés
  } = options;

  // Configuration de multer
  const upload = multer({
    storage: createAzureStorage(),
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
      const ext = getFileExtension(file.originalname).substring(1); // Enlève le "."
      if (allowedFormats.includes(ext)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Format de fichier non supporté. Autorisés : ${allowedFormats.join(
              ", "
            )}`
          ),
          false
        );
      }
    },
  });

  // Middleware Azure exécuté après multer
  const azureUploadMiddleware = async (req, res, next) => {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      if (files.length === 0) return next();

      // Récupère ou crée le container
      const containerClient =
        blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists({
        access:
          containerName === process.env.AZURE_CONTAINER_PROFILE_IMAGES
            ? "blob" // public read access pour les images de profil
            : "container", // privé par défaut
      });

      const uploadedFiles = [];

      for (const file of files) {
        const uniqueFilename = generateUniqueFilename(file.originalname);
        const blockBlobClient =
          containerClient.getBlockBlobClient(uniqueFilename);

        // Options d’upload : type MIME + métadonnées
        const uploadOptions = {
          blobHTTPHeaders: {
            blobContentType: file.mimetype,
          },
          metadata: {
            originalName: file.originalname.replace(/[^\w\s.-]/gi, ""), // Nettoie les caractères spéciaux
            uploadedAt: new Date().toISOString(),
          },
        };

        // Upload vers Azure
        await blockBlobClient.upload(
          file.buffer,
          file.buffer.length,
          uploadOptions
        );

        let fileUrl;

        if (generateSignedUrl) {
          // Génère un SAS Token de lecture, valable 24h
          const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
          const sasToken = generateBlobSASQueryParameters(
            {
              containerName,
              blobName: uniqueFilename,
              permissions: BlobSASPermissions.parse("r"), // read only
              expiresOn,
            },
            sharedKeyCredential
          ).toString();

          fileUrl = `${blockBlobClient.url}?${sasToken}`;
        } else {
          // URL publique directe
          fileUrl = blockBlobClient.url;
        }

        // Ajoute les infos utiles au fichier
        file.path = fileUrl;
        file.filename = uniqueFilename;
        file.location = fileUrl;

        uploadedFiles.push(fileUrl);
        console.log(`✅ Fichier uploadé sur Azure Blob : ${fileUrl}`);
      }

      // Injection des URLs dans req.body si c’est un bug report
      if (
        containerName ===
        (process.env.AZURE_CONTAINER_BUG_REPORTS || "bug-reports")
      ) {
        req.body.screenshots = uploadedFiles;
      }

      next();
    } catch (error) {
      console.error("❌ Erreur upload Azure Blob Storage:", error);
      next(error);
    }
  };

  // Retourne le middleware combiné : multer + upload Azure
  return (req, res, next) => {
    const uploadHandler =
      containerName ===
      (process.env.AZURE_CONTAINER_BUG_REPORTS || "bug-reports")
        ? upload.array("screenshots", 5)
        : upload.single("imageUrl");

    uploadHandler(req, res, (err) => {
      if (err) return next(err);
      azureUploadMiddleware(req, res, next);
    });
  };
};

// Export des middlewares spécialisés
module.exports = {
  // Upload public pour images de profil
  profileImageUploader: createAzureUploader(
    process.env.AZURE_CONTAINER_PROFILE_IMAGES || "profile-images",
    {
      allowedFormats: ["jpg", "jpeg", "png"],
      maxSize: 5 * 1024 * 1024,
      generateSignedUrl: false,
    }
  ),

  // Upload privé + URL signée pour les bug reports
  bugReportUploader: createAzureUploader(
    process.env.AZURE_CONTAINER_BUG_REPORTS || "bug-reports",
    {
      allowedFormats: ["jpg", "jpeg", "png", "webp"],
      maxSize: 10 * 1024 * 1024,
      generateSignedUrl: true,
    }
  ),

  // Accès à la fabrique pour uploader personnalisé
  createAzureUploader,
};
