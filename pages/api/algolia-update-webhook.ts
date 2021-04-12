import { NextApiRequest, NextApiResponse } from "next";
import { indexSearchableStructure, processNotIndexedContent, searchIndex } from "../../lib/api";
import { SearchableItem } from "../../next-env";
import { IWebhookDeliveryResponse } from "@kentico/kontent-webhook-helper";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // Only receiving POST requests
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  // Empty body
  if (!req.body) {
    return { statusCode: 400, body: "Missing Data" };
  }

  // Consistency check - make sure your netlify environment variable and your webhook secret matches
  /*if (!event.headers['x-kc-signature'] || !KontentHelper.signatureHelper.isValidSignatureFromString(event.body, KONTENT_SECRET, event.headers['x-kc-signature'])) {
    return { statusCode: 401, body: "Unauthorized" };
  }*/
  // or use official library
  // import { signatureHelper } from '@kentico/kontent-webhook-helper';
  // const isValid = signatureHelper.isValidSignatureFromString(
  //     payload,
  //     secret,
  //     signature);

  console.log(req.body);
  const webhook: IWebhookDeliveryResponse = req.body;

  const itemsToIndex: SearchableItem[] = [];
  for (const affectedItem of webhook.data.items) {
    const foundItems: SearchableItem[] = await searchIndex(affectedItem.codename);

    // item not found in algolia  => new content to be indexed?
    if (foundItems.length == 0) {
      itemsToIndex.push(...await processNotIndexedContent(affectedItem.codename));
    }
    else {
      // we actually found some items in algolia => update or delete?
      for (const foundItem of foundItems) {
        itemsToIndex.push(...await processNotIndexedContent(foundItem.codename));
      }
    }
  }

  const distinctItemsCodenames = Array.from(new Set(itemsToIndex.map(item => item.codename)));
  const uniqueItems = distinctItemsCodenames.map(codename => itemsToIndex.find(item => item.codename === codename));
  const indexedItems: string[] = await indexSearchableStructure(uniqueItems);

  res.status(200)
    .json(indexedItems);
}