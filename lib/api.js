import { DeliveryClient } from "@kentico/kontent-delivery";
import { name, version } from "../package.json";

const sourceTrackingHeaderName = "X-KC-SOURCE";

const client = new DeliveryClient({
  projectId: process.env.KONTENT_PROJECT_ID,
  previewApiKey: process.env.KONTENT_PREVIEW_API_KEY,
  globalHeaders: (_queryConfig) => [
    {
      header: sourceTrackingHeaderName,
      value: `${name};${version}`,
    },
  ],
});

async function loadWebsiteConfig(preview = false) {
  const config = await client.item("homepage")
    .depthParameter(6)
    // This overfetching by ignoring `subpages` element
    // https://docs.kontent.ai/reference/delivery-api#tag/Projection
    .elementsParameter([
      "title", "base_font", "favicon", "palette", "label", "header_logo",
      "main_menu", "actions", "label", "slug", "content", "icon", "icon_position", "role",
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
        info: page.system, // will be ignored by next in getContentPaths
        content: page.content && page.content.value[0].system // TODO set element limitation to one
      }
    });

    // Listing pages
    const contentItem = page.content.value && page.content.value[0];
    if (contentItem && contentItem.system.type === "listing_page") {
      const subItems = await client.items()
        .type(contentItem.content_type.value)
        .elementsParameter(["slug"])
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
            info: subItem.system, // will be ignored by next in getContentPaths
            content: subItem.content && subItem.content.value[0].system // TODO set element limitation to one
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
  const root = await client.item("homepage")
    .depthParameter(3) // depends on the sitemap level (+1 for content type to download)
    .elementsParameter(["subpages", "slug", "content", "content_type"])
    .queryConfig({
      usePreviewMode: preview
    })
    .toPromise()
    .then(result => result.item);

  const rootSlug = [];
  const pathsFromKontent = [
    {
      params: {
        slug: rootSlug,
        info: root.system, // will be ignored by next in getContentPaths,
        content: root.content && root.content.value[0].system // TODO set element limitation to one
      }
    }
  ];

  const subPaths = await getSubPaths(root.subpages.value, rootSlug, preview);

  return pathsFromKontent.concat(...subPaths);
}

// TODO use other transformation mechanism to cut out all not necessary data
// Names of properties, Type name of the properties (preserve system.type), some system parts, contract for images, possibly narrow images resolutions, itemCodenames, 
function replacer(key, value) {
  if (key.startsWith("_") || key === "rawData" || key === "subpages" || key === "contract" || key === "itemCodenames") {
    return undefined;
  }
  if (key === "type" && (value === "text" || value === "asset" || value === "multiple_choice" || value === "modular_content" || value === "rich_text" || value === "number")) {
    return undefined;
  }
  return value;
}

export async function getPageStaticPropsForPath(params, preview = false) {
  console.log(new Date(), "Page [[...slug]].js getPageStaticPropsForPath : ", params);

  console.log(new Date(), "Page [[...slug]].js loadWebsiteConfig start: ", params);
  const config = await loadWebsiteConfig(preview); // TODO could be cached
  console.log(new Date(), "Page [[...slug]].js loadWebsiteConfig end ", params);
  console.log(new Date(), "Page [[...slug]].js getSitemapMappings start: ", params);
  const mappings = await getSitemapMappings(preview); // TODO could be cached
  console.log(new Date(), "Page [[...slug]].js getSitemapMappings end: ", params);

  const slugValue = params && params.slug ? params.slug : [];

  const pathMapping = mappings.find(path => path.params.slug.join("#") === slugValue.join("#")); // condition works for array of basic values

  if (!pathMapping) {
    return undefined;
  }

  const itemContentSystemInfo = pathMapping && pathMapping.params.content || pathMapping.params.info; // use info for post type

  if (!itemContentSystemInfo) {
    return undefined;
  }

  // TODO the only "content" element linked item/s should be loaded - currently it is reloading all site data basically (incl. subpages)
  console.log(new Date(), "Page [[...slug]].js load item Info start: ", params);
  const response = await client.item(itemContentSystemInfo.codename)
    .depthParameter(5)
    .queryConfig({
      usePreviewMode: preview
    })
    .toPromise();
  const item = response.item;
  console.log(new Date(), "Page [[...slug]].js load item Info end: ", params);


  const result = {
    page: JSON.parse(JSON.stringify(item, replacer)), // TODO #12
    linkedItems: JSON.parse(JSON.stringify(response.linkedItems, replacer)), // TODO #12
    data: {
      config: JSON.parse(JSON.stringify(config, replacer)), // TODO #12
      mappings: JSON.parse(JSON.stringify(mappings, replacer)), // TODO #12
    },
    related: {}
  };

  const isLandingPage =
    item.system.type === "landing_page";

  const isListingPage = item.system.type === "listing_page";

  if (isLandingPage) {
    console.log(new Date(), "Page [[...slug]].js load landing page items start: ", params);
    const listingSections = item.sections.value
      .filter(section => section.system.type === "listing_section");

    for (const listingSection of listingSections) {
      console.log(new Date(), "Page [[...slug]].js load landing pages listing sections items start: ", params);
      const linkedItems = await client.items()
        .type(listingSection.content_type.value)
        .orderByDescending(listingSection.order_by.value)
        .limitParameter(listingSection.number_of_items.value)
        .queryConfig({
          usePreviewMode: preview
        })
        .toPromise()
        .then(result => result.items);
      result.related[listingSection.system.codename] = JSON.parse(JSON.stringify(linkedItems, replacer));  // TODO polish serialization of the js SDK response
      console.log(new Date(), "Page [[...slug]].js load landing pages listing sections items end: ", params);
    }
    console.log(new Date(), "Page [[...slug]].js load landing page items end: ", params);
  } else if (isListingPage) {
    console.log(new Date(), "Page [[...slug]].js load listing page items start: ", params);

    const linkedItems = await client.items()
      .type(item.content_type.value)
      .queryConfig({
        usePreviewMode: preview
      })
      .toPromise()
      .then(result => result.items);

    result.related[item.system.codename] = JSON.parse(JSON.stringify(linkedItems, replacer));  // TODO polish serialization of the js SDK response
    console.log(new Date(), "Page [[...slug]].js load listing page items start: ", params);
  }

  return result;
}