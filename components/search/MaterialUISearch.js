import { connectSearchBox } from "react-instantsearch-dom";
import MaterialUISearchBox from "./MaterialUISearchBox";
import algoliasearch from "algoliasearch/lite";
import { InstantSearch, Hits } from "react-instantsearch-dom";
import { Card, makeStyles } from "@material-ui/core";
import { getUrlFromMapping } from "../../utils";
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

}));

function MaterialUISearch(props) {
  const classes = useStyles();
  const CustomSearchBox = connectSearchBox(MaterialUISearchBox);

  const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID,
    process.env.ALGOLIA_SEARCH_API_KEY
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
      indexName={process.env.ALGOLIA_INDEX_NAME}
      searchClient={searchClient}
    >
      <CustomSearchBox />
      <Card className={classes.hits}>
        <Hits hitComponent={({ hit }) => (
          <a href={getUrlFromMapping(get(props, "data.mappings", []), hit.codename)}>
            {hit.name}
          </a>
        )} />
      </Card>
    </InstantSearch>
  );
}

export default MaterialUISearch;
