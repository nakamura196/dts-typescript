# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript/Express.js implementation of the Distributed Text Services (DTS) API for the Kouigenji Monogatari Text Database (校異源氏物語テキストDB). The API serves TEI/XML documents related to classical Japanese literature texts.

## Development Commands

- `npm run dev` - Start development server with hot reload (uses nodemon)
- `npm start` - Start production server directly with ts-node
- `npm test` - Run tests with vitest
- `npx tsc --noEmit` - Type check without emitting files
- `vercel deploy` - Deploy to Vercel platform

## Architecture

### API Versioning
The application implements dual API versions:
- **v1 APIs** (`/api/v1/dts/*`) - Original DTS implementation
- **v2 APIs** (`/api/v2/dts/*`) - Enhanced DTS with improved formatting and metadata

Both versions expose the same four core endpoints: entry point, collections, documents, and navigation.

### Data Source Integration
All XML document retrieval is centralized through `src/utils/xmlParser.ts`:
- Fetches TEI/XML files from `https://kouigenjimonogatari.github.io/tei/{volume}.xml`
- Document IDs follow pattern `urn:kouigenjimonogatari.{volume}` where volume maps to padded filenames
- Uses `@xmldom/xmldom` for secure XML parsing (migrated from vulnerable `xmldom` package)

### Core DTS Endpoints
Each API version implements four standard DTS endpoints:
1. **Entry Point** (`/dts`) - API capabilities discovery
2. **Collections** (`/dts/collection[s]`) - Metadata about text collections
3. **Documents** (`/dts/document`) - Actual TEI/XML content retrieval
4. **Navigation** (`/dts/navigation`) - Citation structure and references

### Key Architectural Differences v1 vs v2
- **v2** follows DTS 1.0 specification (context: `https://dtsapi.org/context/v1.0.json`)
- **v2** includes enhanced XML formatting using `xml-formatter`
- **v2** supports multiple Citation Trees: default (page/line) and waka (`tree=waka`)
- **v2** includes Dublin Core metadata (creator, title, description, license)
- **v2** uses `resource` parameter instead of `id` for documents/navigation
- **v2** returns `application/ld+json` for JSON responses and `application/tei+xml` for documents
- **v2** includes `Link` header with `rel="collection"` in document responses

### Citation Trees
Citation Trees are defined in `src/utils/citationTrees.ts` and shared across collection, navigation, and document endpoints:
- **Default** (no `tree` param): page → line (from `<pb>` and `<seg corresp="...">`)
- **Waka** (`tree=waka`): waka → ku (from `<lg type="waka" xml:id="waka-XXX">` and `<l n="1..5">`)

### Documentation & CORS
- OpenAPI/Swagger documentation auto-generated from JSDoc comments
- Swagger UI available at `/api-docs`
- CORS enabled for all origins
- Production: `https://dts-typescript.vercel.app`
- Development: `http://localhost:3403`

### XML Processing Types
When working with XML DOM operations, use the proper `@xmldom/xmldom` types:
- Import: `XMLDocument`, `XMLElement`, `XMLNode` from `@xmldom/xmldom`
- Avoid `any` types - use proper XML DOM type casting
- The `getDocument()` utility returns `XMLDocument | null`

### Deployment
Configured for Vercel deployment with:
- Entry point: `src/index.ts`
- All `/api/*` routes handled by the Express app
- CORS headers configured in `vercel.json`
- Root redirects to `/api/v2/dts`