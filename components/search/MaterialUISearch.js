import { connectSearchBox, Snippet } from "react-instantsearch-dom";
import MaterialUISearchBox from "./MaterialUISearchBox";
import algoliasearch from "algoliasearch/lite";
import { InstantSearch, Hits } from "react-instantsearch-dom";
import { Card as div, makeStyles } from "@material-ui/core";
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
  hit: {
    display: "flex",
    flexDirection: "row",
    padding: theme.spacing(1),
    margin: theme.spacing(1),
    background: "grey",
    "& em": {
      background: "yellow"
    },
  },
  highlight: {
    border: "2px solid yellow"
  }


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
      <div className={classes.hits}>
        <Hits hitComponent={({ hit }) => {
          console.log(hit);
          return (
            // <a href={getUrlFromMapping(get(props, "data.mappings", []), hit.codename)}>
            //   {hit.name}
            // </a>
            <div className={classes.hit}>
              <a href={getUrlFromMapping(get(props, "data.mappings", []), hit.codename)}>
                {hit.name}
              </a>
              {/* TODO: identify proper indexes of the hit */}
              <Snippet hit={hit} attribute="content[0].contents" />
            </div>
          );
        }} />
      </div>
    </InstantSearch>
  );
}

export default MaterialUISearch;
