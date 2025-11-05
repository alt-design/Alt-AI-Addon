/**
 * Chat Context Extractor
 *
 * Extracts context information from the current Statamic page/entry
 * including field values, metadata, and user information.
 */

/**
 * Extract plain text from Bard JSON structure
 * @param {Object} bardContent - Bard field content object
 * @returns {string} Extracted plain text
 */
export function extractTextFromBard(bardContent) {
    if (!bardContent || typeof bardContent !== 'object') {
        return '';
    }

    let text = '';

    // Recursive function to extract text from nodes
    const extractFromNode = (node) => {
        // If node has text property, add it
        if (node.text) {
            text += node.text;
        }

        // If node has content array, recurse through it
        if (node.content && Array.isArray(node.content)) {
            node.content.forEach(childNode => {
                extractFromNode(childNode);
                // Add space or newline between blocks
                if (childNode.type === 'paragraph' || childNode.type === 'heading') {
                    text += ' ';
                }
            });
        }
    };

    // Start extraction from root
    if (bardContent.content && Array.isArray(bardContent.content)) {
        bardContent.content.forEach(node => {
            extractFromNode(node);
        });
    } else {
        extractFromNode(bardContent);
    }

    return text.trim();
}

/**
 * Extract comprehensive context from the current Statamic page
 * @returns {Object} Context object containing page information
 */
export function extractContext() {
    const context = {
        route: window.location.pathname
    };

    // Extract collection name from URL
    // Pattern: /cp/collections/{collection_name}/...
    const pathParts = window.location.pathname.split('/');
    if (pathParts.includes('collections')) {
        const collectionIndex = pathParts.indexOf('collections');
        if (pathParts[collectionIndex + 1]) {
            context.collection = pathParts[collectionIndex + 1];
        }
    }

    // Extract taxonomy name from URL
    // Pattern: /cp/taxonomies/{taxonomy_name}/...
    if (pathParts.includes('taxonomies')) {
        const taxonomyIndex = pathParts.indexOf('taxonomies');
        if (pathParts[taxonomyIndex + 1]) {
            context.taxonomy = pathParts[taxonomyIndex + 1];
        }
    }

    // Extract globals name from URL
    // Pattern: /cp/globals/{global_name}/...
    if (pathParts.includes('globals')) {
        const globalsIndex = pathParts.indexOf('globals');
        if (pathParts[globalsIndex + 1]) {
            context.global = pathParts[globalsIndex + 1];
        }
    }

    // Extract entry ID from URL (last segment after /entries/)
    if (pathParts.includes('entries')) {
        const entriesIndex = pathParts.indexOf('entries');
        if (pathParts[entriesIndex + 1] && pathParts[entriesIndex + 1] !== 'create') {
            context.entry_id = pathParts[entriesIndex + 1];
        }
    }

    // Try to get comprehensive context from Statamic's Vuex store (preferred) or Vue component tree (fallback)
    try {
        let publishData = null;

        // PREFERRED METHOD: Access publish data from Vuex store
        // Statamic stores publish form data in a dynamic Vuex module at publish/{name}
        // The default name is 'base' for most entry/term/global forms
        if (Statamic.$store && Statamic.$store.state && Statamic.$store.state.publish) {
            // Try common publish module names
            const publishModuleNames = ['base', 'default', 'entry', 'term', 'global'];

            for (const moduleName of publishModuleNames) {
                if (Statamic.$store.state.publish[moduleName]) {
                    publishData = {
                        values: Statamic.$store.state.publish[moduleName].values || {},
                        blueprint: Statamic.$store.state.publish[moduleName].blueprint || null,
                        meta: Statamic.$store.state.publish[moduleName].meta || {},
                        site: Statamic.$store.state.publish[moduleName].site || null,
                        isRoot: Statamic.$store.state.publish[moduleName].isRoot || false,
                    };
                    break;
                }
            }
        }

        // FALLBACK METHOD: If Vuex store doesn't have publish data, traverse component tree
        if (!publishData || Object.keys(publishData.values).length === 0) {

            if (Statamic.$app && Statamic.$app.$children) {
                // Try to find publish component
                const findPublishComponent = (component) => {
                    if (!component) return null;

                    // Check if this is a publish component
                    if (component.$options && component.$options.name === 'publish-form') {
                        return component;
                    }

                    // Check refs for publish component
                    if (component.$refs && component.$refs.publish) {
                        return component.$refs.publish;
                    }

                    // Recursively search children
                    if (component.$children && component.$children.length > 0) {
                        for (let child of component.$children) {
                            const found = findPublishComponent(child);
                            if (found) return found;
                        }
                    }

                    return null;
                };

                const publishComponent = findPublishComponent(Statamic.$app);

                if (publishComponent) {
                    publishData = {
                        values: publishComponent.values || {},
                        blueprint: publishComponent.blueprint || null,
                        meta: publishComponent.meta || {},
                        site: publishComponent.site || null,
                        isRoot: publishComponent.isRoot || false,
                    };
                }
            }
        }

        // Process the publish data if we found it (from either Vuex or component)
        if (publishData && publishData.values) {
            // Get blueprint name/handle only (not the entire blueprint object which may contain circular references)
            if (publishData.blueprint) {
                // Extract only the name/handle from blueprint, not the entire complex object
                if (typeof publishData.blueprint === 'string') {
                    context.blueprint = publishData.blueprint;
                } else if (typeof publishData.blueprint === 'object' && publishData.blueprint !== null) {
                    // Blueprint is an object - extract only the handle/name
                    context.blueprint = publishData.blueprint.handle || publishData.blueprint.name || publishData.blueprint.namespace || null;
                }
            }

            // Extract field labels from blueprint to create handle → display name mapping
            // This allows the AI to understand the relationship between field handles and their display labels
            context.field_labels = {};
            if (publishData.blueprint && typeof publishData.blueprint === 'object' && publishData.blueprint.tabs) {
                // Blueprint structure: { tabs: [ { sections: [ { fields: [ { handle, display, type, ... } ] } ] } ] }
                publishData.blueprint.tabs.forEach(tab => {
                    if (tab.sections && Array.isArray(tab.sections)) {
                        tab.sections.forEach(section => {
                            if (section.fields && Array.isArray(section.fields)) {
                                section.fields.forEach(field => {
                                    if (field.handle && field.display) {
                                        context.field_labels[field.handle] = field.display;
                                    }
                                });
                            }
                        });
                    }
                });
            }

            // Get entry values (contains all field data)
            // Extract specific important metadata fields first
            if (publishData.values.title) {
                context.title = publishData.values.title;
            }
            if (publishData.values.slug) {
                context.slug = publishData.values.slug;
            }
            if (publishData.values.published !== undefined) {
                context.status = publishData.values.published ? 'published' : 'draft';
            }

            // Now extract ALL field values from the page
            // This gives the AI complete context about what the user is working on
            context.fields = {};

            // Fields to exclude (system/internal fields that don't add useful context)
            const excludedFields = [
                'id', 'blueprint', 'published', 'slug', 'title', // Already extracted above
                'updated_by', 'updated_at', 'created_at', // Timestamps (we capture these separately)
                'origin', 'site', 'locale', // Site/locale (captured separately)
            ];

            // Iterate through all field values
            Object.keys(publishData.values).forEach(fieldName => {
                // Skip excluded fields
                if (excludedFields.includes(fieldName)) {
                    return;
                }

                const fieldValue = publishData.values[fieldName];

                // Skip null, undefined, or empty values
                if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
                    return;
                }

                // Format the value based on its type
                let formattedValue = fieldValue;

                // Handle arrays (tags, categories, etc.)
                if (Array.isArray(fieldValue)) {
                    if (fieldValue.length === 0) return; // Skip empty arrays

                    // Check if this is an array of Bard content blocks (Statamic v3/v4 format)
                    // Bard fields can be arrays of objects with type/content structure
                    const hasBardStructure = fieldValue.length > 0 &&
                                             fieldValue.every(item => typeof item === 'object' &&
                                                                     (item.type === 'paragraph' || item.type === 'heading' || item.type === 'set' || item.content));

                    if (hasBardStructure) {
                        // This is a Bard field - extract text from the array of content blocks
                        let bardText = '';
                        fieldValue.forEach(block => {
                            const blockText = extractTextFromBard(block);
                            if (blockText) {
                                bardText += blockText + ' ';
                            }
                        });
                        formattedValue = bardText.trim();

                        if (!formattedValue || formattedValue.length === 0) return; // Skip if no text extracted
                    } else {
                        // Regular array (tags, categories, etc.)
                        formattedValue = fieldValue;
                    }
                }
                // Handle Bard/rich text content (single object with content property)
                else if (typeof fieldValue === 'object' && fieldValue.content) {
                    // Extract text from Bard JSON structure
                    formattedValue = extractTextFromBard(fieldValue);
                    if (!formattedValue || formattedValue.trim().length === 0) return; // Skip if no text content
                }
                // Handle objects (could be assets, relationships, etc.)
                else if (typeof fieldValue === 'object') {
                    // Try to extract meaningful data from object
                    if (fieldValue.value !== undefined) {
                        formattedValue = fieldValue.value;
                    } else if (fieldValue.url) {
                        formattedValue = fieldValue.url;
                    } else if (fieldValue.path) {
                        formattedValue = fieldValue.path;
                    } else {
                        // For complex objects, store as is (will be JSON stringified later)
                        formattedValue = fieldValue;
                    }
                }
                // Handle booleans
                else if (typeof fieldValue === 'boolean') {
                    formattedValue = fieldValue;
                }
                // Handle strings and numbers
                else {
                    formattedValue = fieldValue;
                }

                // Add to context
                context.fields[fieldName] = formattedValue;
            });

            // Also keep specific fields at top level for backwards compatibility
            if (publishData.values.date) {
                context.date = publishData.values.date;
            }
            if (publishData.values.created_at) {
                context.created_at = publishData.values.created_at;
            }
            if (publishData.values.updated_at) {
                context.updated_at = publishData.values.updated_at;
            }
            if (publishData.values.categories && Array.isArray(publishData.values.categories)) {
                context.categories = publishData.values.categories;
            }
            if (publishData.values.tags && Array.isArray(publishData.values.tags)) {
                context.tags = publishData.values.tags;
            }
            if (publishData.values.author) {
                context.author = publishData.values.author;
            }
            if (publishData.values.parent) {
                context.parent = publishData.values.parent;
            }

            // Get meta information from publish data
            if (publishData.meta) {
                // Permalink/URL
                if (publishData.meta.permalink) {
                    context.permalink = publishData.meta.permalink;
                }
            }

            // Site information (multisite)
            if (publishData.site) {
                context.site = publishData.site;
            }

            // Locale/Language
            if (publishData.locale) {
                context.locale = publishData.locale;
            }

            // Collection handle (might be different from URL)
            if (publishData.collection) {
                context.collection = publishData.collection;
            }

            // Check if it's a new entry (only available from Vuex store)
            if (publishData.isRoot !== undefined) {
                context.is_root = publishData.isRoot;
            }
        }

        // Get current user information from Statamic config
        if (Statamic.$config && typeof Statamic.$config.get === 'function') {
            const user = Statamic.$config.get('user');
            if (user) {
                context.current_user = {
                    name: user.name || user.email,
                    email: user.email,
                    id: user.id
                };
            }

            // Get site information
            const selectedSite = Statamic.$config.get('selectedSite');
            if (selectedSite && !context.site) {
                context.site = selectedSite;
            }

            // Get multisite status
            const multisiteEnabled = Statamic.$config.get('multisiteEnabled');
            if (multisiteEnabled !== undefined) {
                context.multisite = multisiteEnabled;
            }
        }
    } catch (e) {
        // Silently fail context extraction
    }

    // Fallback: Try to get title from DOM input fields
    if (!context.title) {
        const titleInput = document.querySelector('input[name="title"]');
        if (titleInput && titleInput.value) {
            context.title = titleInput.value;
        }
    }

    // Try to get blueprint from meta tags or data attributes
    if (!context.blueprint) {
        const blueprintMeta = document.querySelector('[data-blueprint]');
        if (blueprintMeta) {
            context.blueprint = blueprintMeta.getAttribute('data-blueprint');
        }
    }

    // Extract page type from route
    if (pathParts.includes('collections')) {
        context.page_type = 'collection_entry';
    } else if (pathParts.includes('taxonomies')) {
        context.page_type = 'taxonomy_term';
    } else if (pathParts.includes('globals')) {
        context.page_type = 'global';
    } else if (pathParts.includes('assets')) {
        context.page_type = 'asset';
    } else if (pathParts.includes('navigation')) {
        context.page_type = 'navigation';
    } else {
        context.page_type = 'other';
    }

    return context;
}
