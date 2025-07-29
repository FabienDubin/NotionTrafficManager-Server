const { Client } = require("@notionhq/client");
require('dotenv').config();

// Script de diagnostic simplifié utilisant les variables d'environnement
async function debugNotionAPI() {
  console.log("🔍 Starting Notion API Debug Script (Simple Version)...\n");

  try {
    // 1. Utiliser les variables d'environnement directement
    console.log("📋 Loading Notion configuration from .env...");
    
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const traficDatabaseId = process.env.NOTION_DATABASE_TRAFIC_ID;

    console.log(`✅ Notion API Key: ${process.env.NOTION_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`✅ Trafic DB ID: ${traficDatabaseId ? '✅ Set' : '❌ Missing'}`);
    console.log("");

    if (!process.env.NOTION_API_KEY || !traficDatabaseId) {
      console.error("❌ Missing required environment variables!");
      return;
    }

    // 2. ID de la tâche à analyser (extrait de l'URL)
    const taskId = "23f7ac3b-68c2-8021-beda-e0eb1359a9e5";
    console.log(`🎯 Analyzing task: ${taskId}\n`);

    // 3. Récupérer les données brutes de la tâche via Database Query
    console.log("📥 Fetching task data via Database Query...");
    const queryResponse = await notion.databases.query({
      database_id: traficDatabaseId,
      filter: {
        property: "Nom de tâche",
        title: {
          equals: "Reporting mensuel"
        }
      },
      page_size: 1
    });

    if (queryResponse.results.length === 0) {
      console.error("❌ No task found with name 'Reporting mensuel'");
      return;
    }

    const pageResponse = queryResponse.results[0];
    console.log("✅ Task data retrieved via Database Query!\n");

    // 3b. Comparer avec Page Retrieve pour diagnostic
    console.log("🔍 COMPARISON: Database Query vs Page Retrieve");
    console.log("=" .repeat(50));
    
    try {
      console.log("📥 Also fetching same task via Page Retrieve for comparison...");
      const directPageResponse = await notion.pages.retrieve({
        page_id: taskId
      });
      
      const queryClientRollup = pageResponse.properties["Client"]?.rollup;
      const directClientRollup = directPageResponse.properties["Client"]?.rollup;
      
      console.log("🔍 Client rollup via Database Query:");
      console.log(JSON.stringify(queryClientRollup, null, 2));
      
      console.log("\n🔍 Client rollup via Page Retrieve:");
      console.log(JSON.stringify(directClientRollup, null, 2));
      
      console.log(`\n📊 Comparison result:`);
      console.log(`Query relation length: ${queryClientRollup?.array?.[0]?.relation?.length || 0}`);
      console.log(`Direct relation length: ${directClientRollup?.array?.[0]?.relation?.length || 0}`);
      
    } catch (error) {
      console.log("⚠️ Could not compare with Page Retrieve:", error.message);
    }
    
    console.log("");

    // 4. Analyser les propriétés
    const properties = pageResponse.properties;
    
    console.log("🔍 TASK PROPERTIES ANALYSIS:");
    console.log("=" .repeat(50));
    
    // Nom de la tâche
    const taskName = properties["Nom de tâche"]?.title?.[0]?.plain_text || "Unknown";
    console.log(`📝 Task Name: "${taskName}"`);
    console.log("");

    // 5. Lister toutes les propriétés disponibles
    console.log("📋 ALL AVAILABLE PROPERTIES:");
    console.log("-" .repeat(30));
    Object.keys(properties).forEach(key => {
      const prop = properties[key];
      console.log(`  - "${key}" (${prop.type})`);
    });
    console.log("");

    // 6. Analyser spécifiquement le champ Client
    console.log("🎯 CLIENT PROPERTY ANALYSIS:");
    console.log("-" .repeat(30));
    
    const clientProperty = properties["Client"];
    if (clientProperty) {
      console.log("✅ Client property found!");
      console.log(`Type: ${clientProperty.type}`);
      console.log("Raw client property structure:");
      console.log(JSON.stringify(clientProperty, null, 2));
      
      if (clientProperty.type === "rollup") {
        console.log("\n🔍 ROLLUP ANALYSIS:");
        console.log(`Rollup type: ${clientProperty.rollup?.type}`);
        console.log("Rollup content:");
        console.log(JSON.stringify(clientProperty.rollup, null, 2));
        
        if (clientProperty.rollup?.type === "array") {
          console.log(`\n📊 Array contains ${clientProperty.rollup.array?.length || 0} items:`);
          clientProperty.rollup.array?.forEach((item, index) => {
            console.log(`  Item ${index + 1}:`, JSON.stringify(item, null, 2));
          });
        }
      }
    } else {
      console.log("❌ Client property NOT FOUND!");
    }

    console.log("");

    // 7. Analyser le champ Projet pour comparaison
    console.log("🎯 PROJECT PROPERTY ANALYSIS:");
    console.log("-" .repeat(30));
    
    const projectProperty = properties["📁 Projets"];
    if (projectProperty) {
      console.log("✅ Project property found!");
      console.log(`Type: ${projectProperty.type}`);
      console.log("Raw project property:");
      console.log(JSON.stringify(projectProperty, null, 2));
      
      if (projectProperty.relation?.length > 0) {
        const projectId = projectProperty.relation[0].id;
        console.log(`\n🔗 Found linked project: ${projectId}`);
        
        // Récupérer les détails du projet
        console.log("📥 Fetching project details...");
        const projectResponse = await notion.pages.retrieve({
          page_id: projectId
        });
        
        const projectName = projectResponse.properties["Nom"]?.title?.[0]?.plain_text;
        const projectClient = projectResponse.properties["Client"];
        
        console.log(`📝 Project Name: "${projectName}"`);
        console.log("🎯 Project Client property:");
        if (projectClient) {
          console.log(`Type: ${projectClient.type}`);
          console.log(JSON.stringify(projectClient, null, 2));
        } else {
          console.log("❌ No Client property found in project");
          console.log("Available project properties:");
          Object.keys(projectResponse.properties).forEach(key => console.log(`  - "${key}"`));
        }
      }
    } else {
      console.log("❌ Project property NOT FOUND!");
    }

    console.log("");
    console.log("🎯 SUMMARY:");
    console.log("=" .repeat(50));
    console.log(`Task: "${taskName}"`);
    console.log(`Client property exists: ${clientProperty ? "✅ Yes" : "❌ No"}`);
    console.log(`Client rollup type: ${clientProperty?.rollup?.type || "N/A"}`);
    console.log(`Client rollup empty: ${clientProperty?.rollup?.array?.length === 0 ? "❌ Yes" : "✅ No"}`);
    
  } catch (error) {
    console.error("❌ Error during API debug:", error);
    
    if (error.code === "object_not_found") {
      console.error("📝 The page ID might be incorrect or the page might not be accessible.");
    } else if (error.code === "unauthorized") {
      console.error("🔑 Authentication failed. Check your Notion API key and permissions.");
    }
  }
}

// Exécuter le script
debugNotionAPI().then(() => {
  console.log("\n🏁 Debug script completed!");
  process.exit(0);
}).catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});