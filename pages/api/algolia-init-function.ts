import type { NextApiRequest, NextApiResponse } from 'next'
import { createSearchableStructure, getAllContentFromKontent, indexSearchableStructure, setIndexSettings } from '../../lib/api';

export default async (req: NextApiRequest, res: NextApiResponse) => {

  // Only receiving POST requests
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  if (
    req.query.secret !== process.env.ALGOLIA_SECRET
  ) {
    return res
      .status(401)
      .json({ message: "Invalid token" });
  }

  const content = await getAllContentFromKontent();
  const contentWithSlug = content.filter(item => item[process.env.KONTENT_SLUG_ELEMENT_NAME]);

  const searchableStructure = createSearchableStructure(contentWithSlug, content);

  await setIndexSettings();
  const indexedItems = await indexSearchableStructure(searchableStructure);

  res.status(200)
    .json(indexedItems);
}