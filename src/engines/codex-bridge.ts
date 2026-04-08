/**
 * @module CodexBridge
 * @spec: codex-bridge-contract
 * 
 * Read/write interface to the codex index and artifacts.
 * Resolves chambers, links artifacts, and caches results in KV.
 * The codex is stored as static JSON files in the public/ directory.
 */

export interface CodexArtifact {
  id: string;
  chamber: string;
  title: string;
  type: string;
  path: string;
  links: string[];
  metadata: Record<string, unknown>;
  content?: string;
}

export interface CodexChamber {
  name: string;
  description: string;
  artifacts: CodexArtifact[];
}

export class CodexBridge {
  private assets: Fetcher;
  private cache: KVNamespace;

  constructor(assets: Fetcher, cache: KVNamespace) {
    this.assets = assets;
    this.cache = cache;
  }

  /**
   * Load the codex index from public/codex/index.json
   * Caches results for 30 minutes
   */
  async getIndex(): Promise<Record<string, CodexArtifact[]>> {
    try {
      // Check cache first
      const cached = await this.cache.get('cache:codex:index', 'json');
      if (cached) {
        return cached as Record<string, CodexArtifact[]>;
      }

      // Fetch from assets
      const response = await this.assets.fetch('/codex/index.json');
      if (!response.ok) {
        console.warn(`[CodexBridge] Codex index not found: ${response.status}`);
        return {};
      }

      const index = (await response.json()) as Record<string, CodexArtifact[]>;

      // Cache for 30 minutes
      await this.cache.put('cache:codex:index', JSON.stringify(index), { expirationTtl: 1800 });

      return index;
    } catch (err) {
      console.error('[CodexBridge.getIndex]', err);
      return {};
    }
  }

  /**
   * Get artifacts from a specific chamber
   * Caches results for 30 minutes
   */
  async getChamber(chamber: string): Promise<CodexArtifact[]> {
    try {
      const cacheKey = `cache:codex:${chamber}`;

      // Check cache first
      const cached = await this.cache.get(cacheKey, 'json');
      if (cached) {
        return cached as CodexArtifact[];
      }

      // Get from index
      const index = await this.getIndex();
      const artifacts = index[chamber] || [];

      // Cache for 30 minutes
      await this.cache.put(cacheKey, JSON.stringify(artifacts), { expirationTtl: 1800 });

      return artifacts;
    } catch (err) {
      console.error('[CodexBridge.getChamber]', err);
      return [];
    }
  }

  /**
   * Get a specific artifact by ID
   * Loads the full artifact content if available
   */
  async getArtifact(
    artifactId: string,
    chamber?: string
  ): Promise<CodexArtifact | null> {
    try {
      const index = await this.getIndex();

      // Search in specified chamber or all chambers
      let artifact: CodexArtifact | null = null;

      if (chamber) {
        artifact = (index[chamber] || []).find((a) => a.id === artifactId) || null;
      } else {
        for (const artifacts of Object.values(index)) {
          artifact = artifacts.find((a) => a.id === artifactId) || null;
          if (artifact) break;
        }
      }

      if (!artifact) return null;

      // Try to load full content
      if (artifact.path) {
        try {
          const response = await this.assets.fetch(artifact.path);
          if (response.ok) {
            artifact.content = await response.text();
          }
        } catch {
          // Content loading is optional
        }
      }

      return artifact;
    } catch (err) {
      console.error('[CodexBridge.getArtifact]', err);
      return null;
    }
  }

  /**
   * Find artifacts by search term across all chambers
   * Searches in title, type, and metadata
   */
  async search(query: string): Promise<CodexArtifact[]> {
    try {
      const index = await this.getIndex();
      const results: CodexArtifact[] = [];
      const lowerQuery = query.toLowerCase();

      for (const artifacts of Object.values(index)) {
        for (const artifact of artifacts) {
          const titleMatch = artifact.title.toLowerCase().includes(lowerQuery);
          const typeMatch = artifact.type.toLowerCase().includes(lowerQuery);
          const pathMatch = artifact.path.toLowerCase().includes(lowerQuery);

          if (titleMatch || typeMatch || pathMatch) {
            results.push(artifact);
          }
        }
      }

      return results;
    } catch (err) {
      console.error('[CodexBridge.search]', err);
      return [];
    }
  }

  /**
   * Get all chambers available in the codex
   */
  async getChambers(): Promise<string[]> {
    try {
      const index = await this.getIndex();
      return Object.keys(index);
    } catch (err) {
      console.error('[CodexBridge.getChambers]', err);
      return [];
    }
  }

  /**
   * Get chamber count and artifact count summary
   */
  async getStats(): Promise<{ chamberCount: number; artifactCount: number }> {
    try {
      const index = await this.getIndex();
      const chamberCount = Object.keys(index).length;
      let artifactCount = 0;

      for (const artifacts of Object.values(index)) {
        artifactCount += artifacts.length;
      }

      return { chamberCount, artifactCount };
    } catch (err) {
      console.error('[CodexBridge.getStats]', err);
      return { chamberCount: 0, artifactCount: 0 };
    }
  }

  /**
   * Invalidate all codex caches
   * Called after codex reindex or deploy
   */
  async invalidateCache(): Promise<void> {
    try {
      // Delete index cache
      await this.cache.delete('cache:codex:index');

      // Delete chamber caches (we don't know all chambers, so this is opportunistic)
      // In production, maintain a list of known chambers
      const knownChambers = ['identity', 'simulation', 'media', 'research', 'operations'];
      await Promise.all(knownChambers.map((chamber) => this.cache.delete(`cache:codex:${chamber}`)));
    } catch (err) {
      console.error('[CodexBridge.invalidateCache]', err);
    }
  }

  /**
   * Get artifact related to a spec
   * Links specs to codex artifacts via metadata
   */
  async getSpecArtifacts(specSlug: string): Promise<CodexArtifact[]> {
    try {
      const index = await this.getIndex();
      const results: CodexArtifact[] = [];

      for (const artifacts of Object.values(index)) {
        for (const artifact of artifacts) {
          // Check if artifact metadata references this spec
          if (artifact.metadata && Array.isArray(artifact.metadata.specs)) {
            if ((artifact.metadata.specs as string[]).includes(specSlug)) {
              results.push(artifact);
            }
          }
        }
      }

      return results;
    } catch (err) {
      console.error('[CodexBridge.getSpecArtifacts]', err);
      return [];
    }
  }
}
