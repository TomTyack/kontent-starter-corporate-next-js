import { ContentItem, DeliveryClient, GenericElement, Language } from "@kentico/kontent-delivery";
import algoliasearch from "algoliasearch";
import { ContentBlock, SearchableItem, SearchProjectConfiguration as AlgoliaConfiguration } from "../next-env";

const kontentDeliveryClient = new DeliveryClient({
  projectId: process.env.KONTENT_PROJECT_ID,
  previewApiKey: process.env.KONTENT_PREVIEW_API_KEY
});

const algoliaAdminClient = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_API_KEY);

const algoliaIndex = algoliaAdminClient.initIndex(process.env.ALGOLIA_INDEX_NAME);

export async function loadWebsiteConfig(preview = false) {
  const config = await kontentDeliveryClient.item("homepage")
    .depthParameter(6)
    // This overfetching by ignoring `subpages` element
    // https://docs.kontent.ai/reference/delivery-api#tag/Projection
    .elementsParameter([
      "title", "base_font", "favicon", "palette", "label", "header_logo",
      "main_menu", "actions", "label", process.env.KONTENT_SLUG_ELEMENT_NAME, "content", "icon", "icon_position", "role",
      "options", "footer_sections", "image", "content", "fields", "name",
      "type", "value", "navigation_item", "url",
      "submit_label", "form_id", "form_action", "default_value", "configuration",
      "palette", "font", "copyright"
    ])
    .queryConfig({
      usePreviewMode: preview
    })
    .toPromise()
    .then(result => result.item);
  return config;
}

async function getSubPaths(pages, parentSlug, preview = false) {
  const paths = [];

  for (const page of pages) {
    const pageSlug = parentSlug.concat(page.slug.value);
    paths.push({
      params: {
        slug: pageSlug,
        info: page.system// will be ignored by next in getContentPaths
      }
    });

    // Listing pages
    const contentItem = page.content.value && page.content.value[0];
    if (contentItem && contentItem.system.type === "listing_page") {
      const subItems = await kontentDeliveryClient.items()
        .type(contentItem.content_type.value)
        .elementsParameter([process.env.KONTENT_SLUG_ELEMENT_NAME])
        .queryConfig({
          usePreviewMode: preview
        })
        .toPromise()
        .then(result => result.items);

      subItems.forEach(subItem => {
        const subItemSlug = pageSlug.concat(subItem.slug.value);
        paths.push({
          params: {
            slug: subItemSlug,
            info: subItem.system // will be ignored by next in getContentPaths
          }
        });
      });
    }

    const subPaths = await getSubPaths(page.subpages.value, pageSlug, preview);
    paths.push(...subPaths);
  }

  return paths;
}

export async function getSitemapMappings(preview = false) {
  const root = await kontentDeliveryClient.item("homepage")
    .depthParameter(3) // depends on the sitemap level (+1 for content type to download)
    .elementsParameter(["subpages", process.env.KONTENT_SLUG_ELEMENT_NAME, "content", "content_type"])
    .queryConfig({
      usePreviewMode: preview
    })
    .toPromise()
    .then(result => result.item);

  const rootSlug = root.slug.value ? [root.slug.value] : [];
  const pathsFromKontent = [
    {
      params: {
        slug: rootSlug,
        info: root.system// will be ignored by next in getContentPaths
      }
    }
  ];

  const subPaths = await getSubPaths(root.subpages.value, rootSlug, preview);

  return pathsFromKontent.concat(...subPaths);
}


export async function getPageStaticPropsForPath(params, preview = false) {
  const config = await loadWebsiteConfig(preview); // TODO could be cached
  const mappings = await getSitemapMappings(preview); // TODO could be cached

  const slugValue = params && params.slug ? params.slug : [];

  const pathMapping = mappings.find(path => path.params.slug.join("#") === slugValue.join("#")); // condition works for array of basic values

  const itemSystemInfo = pathMapping && pathMapping.params.info;

  if (!itemSystemInfo) {
    return undefined;
  }

  const response = await kontentDeliveryClient.item(itemSystemInfo.codename)
    .depthParameter(5)
    .queryConfig({
      usePreviewMode: preview
    })
    .toPromise();
  const item = response.item;

  const result = {
    page: JSON.parse(JSON.stringify(item)), // TODO #12
    linkedItems: JSON.parse(JSON.stringify(response.linkedItems)), // TODO #12
    data: {
      config: JSON.parse(JSON.stringify(config)), // TODO #12
      mappings: JSON.parse(JSON.stringify(mappings)), // TODO #12
    },
    related: {}
  };

  const isLandingPage =
    item.system.type !== "post"
    && item.content.value.length === 1
    && item.content.value[0].system.type === "landing_page";

  const isListingPage = item.system.type !== "post"
    && item.content.value.length === 1
    && item.content.value[0].system.type === "listing_page";

  if (isLandingPage) {
    const listingSections = item.content.value[0].sections.value
      .filter(section => section.system.type === "listing_section");

    for (const listingSection of listingSections) {
      const linkedItems = await kontentDeliveryClient.items()
        .type(listingSection.content_type.value)
        .orderByDescending(listingSection.order_by.value)
        .limitParameter(listingSection.number_of_items.value)
        .queryConfig({
          usePreviewMode: preview
        })
        .toPromise()
        .then(result => result.items);

      result.related[listingSection.system.codename] = JSON.parse(JSON.stringify(linkedItems));  // TODO polish serialization of the js SDK response
    }
  } else if (isListingPage) {
    const listingPage = item.content.value[0];

    const linkedItems = await kontentDeliveryClient.items()
      .type(listingPage.content_type.value)
      .queryConfig({
        usePreviewMode: preview
      })
      .toPromise()
      .then(result => result.items);

    result.related[listingPage.system.codename] = JSON.parse(JSON.stringify(linkedItems));  // TODO polish serialization of the js SDK response
  }

  return result;
}

export async function getAllContentFromKontent(): Promise<ContentItem[]> {
  const feed = await kontentDeliveryClient.itemsFeedAll()
    .toPromise();

  return [...feed.items, ...Object.values(feed.linkedItems)];
}

export function getAlgoliaConfig(): AlgoliaConfiguration {
  const config = {
    algolia: {
      appId: process.env.ALGOLIA_APP_ID,
      apiKey: process.env.ALGOLIA_API_KEY,
      index: process.env.ALGOLIA_INDEX_NAME
    }
  };

  return config;
}

// extracts text content from an item + linked items
function getContentFromItem(item: ContentItem, parents: string[], children: string[], allContent: ContentItem[]): ContentBlock[] {
  if (!item) return [];

  // array of linked content for this item
  let linkedContent: ContentBlock[] = [];
  const contents: string[] = [];

  // content of the currently processed item
  let itemsContent: ContentBlock = {
    id: item.system.id,
    codename: item.system.codename,
    language: item.system.language,
    collection: item.system.collection,
    type: item.system.type,
    name: item.system.name,
    parents: parents,
    contents: ""
  };

  // go over each element and extract it's contents
  // ONLY FOR TEXT/RICH-TEXT + LINKED ITEMS (modular content)
  for (let propName in item._raw.elements) {
    const property: GenericElement = item[propName];
    const type: string = property.type;
    let stringValue: string = "";

    switch (type) {
      case "text": // for text property -> copy the value
        stringValue = property.value;
        if (stringValue)
          contents.push(stringValue);
        break;
      case "rich_text": // for rich text -> strip HTML and copy the value
        stringValue = property.value.replace(/<[^>]*>?/gm, '');
        if (stringValue)
          contents.push(stringValue)
        // for rich text -> process linked content + components
        if (property.linkedItemCodenames && property.linkedItemCodenames.length > 0)
          linkedContent = [...linkedContent, ...getLinkedContent(property.linkedItemCodenames, [item.system.codename, ...parents], children, allContent)];
        break;
      case "modular_content": // for modular content -> process modular content
        if (property.itemCodenames && property.itemCodenames.length > 0)
          linkedContent = [...linkedContent, ...getLinkedContent(property.itemCodenames, [item.system.codename, ...parents], children, allContent)];
        break;
      //@TODO: case "custom_element": ... (searchable value)
    }
  }

  itemsContent.contents = contents.join(" ").replace('"', ''); // create one long string from contents
  return [itemsContent, ...linkedContent];
}

function getLinkedContent(codenames: string[], parents: string[], children: string[], allContent: ContentItem[]) {
  const linkedContent: ContentBlock[] = [];

  for (let x = 0, linkedCodename: string; (linkedCodename = codenames[x]); x++) {
    const foundLinkedItem: ContentItem | undefined = allContent.find(i => i.system.codename == linkedCodename);
    // IF THE LINKED ITEM CONTAINS SLUG, IT'S NOT BEING INCLUDED IN THE PARENT'S CONTENT

    if (foundLinkedItem) {
      children.push(foundLinkedItem.system.codename);
      if (!foundLinkedItem[process.env.KONTENT_SLUG_ELEMENT_NAME]) {// if the item doesn't have a slug -> include
        linkedContent.push(...getContentFromItem(foundLinkedItem, parents, children, allContent));
      }
    }
  }

  return linkedContent;
}

export function createSearchableStructure(contentWithSlug: ContentItem[], allContent: ContentItem[]): SearchableItem[] {
  const searchableStructure: SearchableItem[] = [];

  // process all items with slug into searchable items
  for (const item of contentWithSlug) {
    // searchable item structure
    const searchableItem: SearchableItem = {
      objectID: item.system.codename,
      id: item.system.id,
      codename: item.system.codename,
      name: item.system.name,
      language: item.system.language,
      type: item.system.type,
      collection: item.system.collection,
      slug: item[process.env.KONTENT_SLUG_ELEMENT_NAME].value,
      parents: [],
      children: [],
      content: []
      // TODO add structured information of an contentwithSlug items
    };

    searchableItem.content = getContentFromItem(item, searchableItem.parents, searchableItem.children, allContent,);
    searchableStructure.push(searchableItem);
  }

  // fill out parents for all `process.env.KONTENT_SLUG_ELEMENT_NAME` items as well
  for (const searchableItem of searchableStructure) {
    searchableItem.parents = searchableStructure.filter(i => i.children.includes(searchableItem.codename)).map(i => i.codename);
  }

  return searchableStructure;
}

export async function setIndexSettings() {
  await algoliaIndex.setSettings({
    searchableAttributes: ["content.contents", "content.name", "name"],
    attributesForFaceting: ["content.codename"],
    attributesToSnippet: ['content.contents:80']
  }).wait();
};

export async function indexSearchableStructure(structure: SearchableItem[] | any): Promise<string[]> {
  const indexed = await algoliaIndex.saveObjects(structure)
    .wait();

  return indexed.objectIDs;
}

async function getAllContentForCodename(codename: string): Promise<ContentItem[]> {
  const content = await kontentDeliveryClient.item(codename)
    .depthParameter(20)
    .toPromise();

  return [content.item, ...Object.values(content.linkedItems)];
}

export async function searchIndex(searchedCodename: string): Promise<SearchableItem[]> {
  // returns the indexed content item(s) that include searched content item
  const response = await algoliaIndex.search<SearchableItem>("", {
    facetFilters: [`content.codename: ${searchedCodename}`]
  });
  return response.hits;
}

// processes affected content (about which we have been notified by the webhook)
export async function processNotIndexedContent(codename: string) {
  console.log("processing content that is not indexed: " + codename);

  // get all content for requested codename
  const content: ContentItem[] = await getAllContentForCodename(codename);
  const itemFromDelivery = content.find(item => item.system.codename == codename);

  // the item has slug => new record
  if (itemFromDelivery && itemFromDelivery[process.env.KONTENT_SLUG_ELEMENT_NAME]) {
    // creates a searchable structure based on the content's structure
    const searchableStructure = createSearchableStructure([itemFromDelivery], content);
    return searchableStructure;
  }

  return [];
}

export async function processIndexedContent(codename: string) {
  console.log("processing indexed content: " + codename);

  const content = await getAllContentForCodename(codename);
  const itemFromDelivery = content.find(item => item.system.codename == codename);

  // nothing found in Kontent => item has been removed
  if (itemFromDelivery) {
    console.log("item will be removed from index: " + codename);
    await removeFromIndex([codename]);
    return [];
  }

  // some content has been found => update existing item by processing it once again
  const searchableStructure = createSearchableStructure([itemFromDelivery], content);
  return searchableStructure;
}

async function removeFromIndex(codenames: string[]): Promise<string[]> {
  // TODO tell Rosta about wait
  const response = await algoliaIndex.deleteObjects(codenames).wait();
  return response.objectIDs;
}