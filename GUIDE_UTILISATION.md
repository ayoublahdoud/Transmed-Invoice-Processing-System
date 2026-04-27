# 📖 Guide d'Utilisation — Transmed Invoice Processing System

---

## 🎯 Qu'est-ce que ce système ?

Ce système traite automatiquement vos factures fournisseurs (PDF, images, XML) grâce à l'intelligence artificielle **Moteur IA Transmed**. Il extrait les données importantes (montants, dates, fournisseurs) sans aucune saisie manuelle.

---

## 🖥 Interface Principale

```
┌─────────────────────────────────────────────────────┐
│  TRANSMED  Invoice AI System — Production    [LIVE]  │ ← Header
├─────────────────────────────────────────────────────┤
│  📥 Zone de dépôt des factures (Drag & Drop)        │ ← Upload
├──────────────────────────┬──────────────────────────┤
│  📊 Statistiques (5 KPI) │                          │
├──────────────────────────┤                          │
│  ⚙️ Pipeline temps réel  │  🔍 Données extraites IA │
│   6 étapes animées       │                          │
├──────────────────────────┴──────────────────────────┤
│  📋 Tableau de toutes les factures traitées         │
└─────────────────────────────────────────────────────┘
```

---

## 📥 1. Déposer une Facture

### Méthode 1 — Drag & Drop
1. Ouvrez votre explorateur de fichiers
2. Sélectionnez votre facture (PDF, JPEG, PNG ou XML)
3. **Glissez-déposez** le fichier dans la zone bleue
4. Le traitement démarre automatiquement

### Méthode 2 — Clic
1. Cliquez dans la zone bleue
2. Sélectionnez le fichier dans l'explorateur
3. Cliquez **Ouvrir**

### Formats acceptés
| Format | Extension | Remarque |
|--------|-----------|----------|
| PDF | `.pdf` | Recommandé — meilleure précision |
| Image JPEG | `.jpg` / `.jpeg` | Photo de facture papier |
| Image PNG | `.png` | Capture d'écran de facture |
| XML | `.xml` | Facture électronique structurée |

> ⚠️ **Taille maximum** : 10 MB par fichier

---

## ⚙️ 2. Pipeline de Traitement (6 Étapes)

Une fois la facture déposée, vous voyez les 6 étapes s'animer en temps réel :

| Étape | Nom | Ce qui se passe réellement |
|-------|-----|--------------------------|
| 01 | **Validation MIME** | Vérification que le fichier est bien un PDF/image/XML valide |
| 02 | **SHA-256 Fingerprint** | Calcul d'une empreinte unique du fichier (détection doublons) |
| 03 | **Déduplication** | Comparaison avec toutes les factures déjà traitées |
| 04 | **Upload Blob** | Sauvegarde sécurisée du fichier dans le cloud Vercel |
| 05 | **Analyse Moteur IA** | L'IA lit et extrait toutes les données de la facture |
| 06 | **Sauvegarde BDD** | Stockage des données extraites dans la base Vercel KV |

### Indicateurs de statut
- 🔵 **EN COURS** — L'étape est en traitement
- ✅ **OK** — L'étape s'est terminée avec succès
- ❌ **ERREUR** — Un problème est survenu (voir message d'erreur)

---

## 🔍 3. Données Extraites par l'IA

Après traitement, le panneau **"Données Extraites — IA"** affiche :

### Informations Principales
- **Fournisseur** : Nom de la société qui a émis la facture
- **N° Facture** : Numéro unique de la facture
- **Date Facture** : Date d'émission
- **Date Échéance** : Date limite de paiement

### Montants
- **Total TTC** : Montant total toutes taxes comprises (en MAD)
- **Sous-total HT** : Montant hors taxes
- **TVA** : Montant et taux de TVA appliqué

### Lignes de Facture
Tableau détaillé de chaque article/service facturé :
- Description du produit
- Quantité
- Prix unitaire
- Montant total par ligne

### Score de Confiance IA
Barre de progression indiquant la fiabilité de l'extraction :
- 🟢 **>80%** : Extraction très fiable
- 🟡 **50-80%** : Relecture recommandée
- 🔴 **<50%** : Vérification manuelle nécessaire

---

## 📊 4. Tableau de Bord (Statistiques)

5 indicateurs clés en temps réel :

| Indicateur | Description |
|------------|-------------|
| **Total** | Nombre total de factures traitées |
| **OCR / IA** | Factures traitées par le pipeline IA Transmed (PDF/images) |
| **Digital Repo** | Factures XML stockées directement |
| **Doublons** | Factures rejetées car déjà existantes |
| **Montant Total** | Somme de tous les TTC extraits (MAD) |

---

## 📋 5. Tableau des Factures

Liste de toutes les factures traitées avec :
- **Fichier** : Nom + taille
- **Fournisseur** : Extrait par l'IA
- **Montant TTC** : En MAD
- **N° Facture**
- **Route** : OCR/IA ou Digital Repo
- **Statut** : Traité / Doublon / En cours
- **Heure** : Moment du traitement

### Filtres disponibles
- **Toutes** : Affiche toutes les factures
- **OCR / IA** : Uniquement les PDF et images
- **Digital Repo** : Uniquement les XML

### Voir le détail
Cliquez sur n'importe quelle ligne pour ouvrir la fiche complète avec :
- Toutes les données extraites
- Le fingerprint SHA-256 (pour audit)
- Les notes de l'IA

---

## ⚠️ 6. Gestion des Doublons

Le système détecte automatiquement les doublons via **SHA-256** :

- Si vous déposez exactement le même fichier deux fois → rejeté avec avertissement
- Un message orange apparaît : `⚠ Doublon détecté`
- La facture n'est **pas** stockée une deuxième fois
- Le compteur **Doublons** dans le dashboard s'incrémente

> 💡 **Bon à savoir** : Deux fichiers avec des noms différents mais un contenu identique sont quand même détectés comme doublons.

---

## 🔄 7. Actualisation

- Le dashboard se met à jour **automatiquement** toutes les 30 secondes
- Pour forcer une actualisation : cliquez le bouton **↻ Actualiser** dans le tableau

---

## 🚨 8. Messages d'Erreur Courants

| Message | Cause | Solution |
|---------|-------|----------|
| `Format non supporté` | Fichier non-PDF/image/XML | Convertir en PDF ou JPEG |
| `Doublon détecté` | Fichier déjà traité | Normal, ignorer |
| `Erreur API` | Problème serveur temporaire | Réessayer dans 30 secondes |
| `Réponse IA invalide` | Facture illisible ou vierge | Améliorer qualité scan |
| `Fichier trop grand` | >10MB | Compresser le fichier |

---

## 💡 9. Conseils pour Meilleurs Résultats

### Pour les scans (JPEG/PNG)
✅ Résolution minimum : **300 DPI**  
✅ Facture bien éclairée, sans ombres  
✅ Texte horizontal (pas de rotation)  
✅ Fond blanc ou clair  

### Pour les PDF
✅ PDF natif (généré par logiciel) > PDF scanné  
✅ Texte sélectionnable si possible  
✅ Un seul document par fichier  

### Pour les XML
✅ Format standard UBL ou Factur-X  
✅ Encodage UTF-8  
✅ Structure valide (bien formé)  

---

## 🔐 10. Confidentialité et Sécurité

- Vos fichiers sont stockés de façon **privée** sur Vercel Blob (non accessibles publiquement)
- Le moteur IA traite vos données selon la [politique de confidentialité Google](https://policies.google.com/privacy)
- Les empreintes SHA-256 garantissent l'intégrité des fichiers
- Aucune donnée n'est partagée avec des tiers

---

## 📞 Support

Pour toute question technique : contacter l'équipe IT Transmed  
Pour les questions sur l'IA : [ai.google.dev](https://ai.google.dev)  
Pour le déploiement : [vercel.com/docs](https://vercel.com/docs)

---

*Transmed Invoice Processing System v2.0 — Propulsé par Moteur IA*
