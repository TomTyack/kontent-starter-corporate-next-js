import { connectSearchBox } from "react-instantsearch-dom";
import MaterialUISearchBox from "./MaterialUISearchBox";
import algoliasearch from "algoliasearch/lite";
import { InstantSearch, Hits } from "react-instantsearch-dom";
import { Card, makeStyles } from "@material-ui/core";
import { getUrlFromMapping } from "../../utils";
import { Link } from "..";
import get from "lodash.get";

const useStyles = makeStyles((theme) => ({
  hits: {
    zIndex: theme.zIndex.appBar,
    position: "absolute",
    marginTop: theme.mixins.toolbar.minHeight,

    "& ul": {
      listStyle: "none",
      margin: 0,
      padding: 0,
      "li": {
        padding: theme.spacing(1)
      }
    }
  },
  hit: {
    display: "flex",
    flexDirection: "row",
    padding: theme.spacing(1),
    margin: theme.spacing(1),
    "& em, & ais-highlight-0000000000": {
      background: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    },
  },
}));

function MaterialUISearch(props) {
  const classes = useStyles();
  const CustomSearchBox = connectSearchBox(MaterialUISearchBox);

  const algoliaClient = algoliasearch(
    props.algoliaConfig.algoliaAppId,
    props.algoliaConfig.algoliaSearchApiKey,
  );

  const searchClient = {
    search(requests) {
      if (requests.every(({ params }) => !params.query)) {
        return Promise.resolve({
          results: requests.map(() => ({
            hits: [],
            nbHits: 0,
            nbPages: 0,
            page: 0,
            processingTimeMS: 0,
          })),
        });
      }
      return algoliaClient.search(requests);
    },
  };


  return (

    <InstantSearch
      indexName={props.algoliaConfig.algoliaIndexName}
      searchClient={searchClient}

    >
      <CustomSearchBox />
      <Card className={classes.hits}>
        <Hits hitComponent={({ hit }) => {
          const snippets = hit._snippetResult.content
            .filter(content => content.contents.matchLevel !== 'none')
            .map((match, index) => (
              <div key={index} dangerouslySetInnerHTML={{ __html: match.contents.value }} />
            ))

          const hitUrl = getUrlFromMapping(get(props, "data.mappings", []), hit.codename);
          if (!hitUrl) {
            return null;
          }

          return (
            <div className={classes.hit}>
              <Link href={hitUrl}>
                {hit.name}
              </Link>
              <div>
                {snippets}
              </div>
            </div>
          );

        }} />
      </Card>
    </InstantSearch>
  );
}

export default MaterialUISearch;
