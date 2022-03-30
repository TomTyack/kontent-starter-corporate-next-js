import get from "lodash.get";
import upperFirst from "lodash.upperfirst";
import camelCase from "lodash.camelcase";
import { Layout, UnknownComponent } from "../components";
import sections from "../components/sections";
import { Box, makeStyles } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  sections: {
    "& > section:first-child": {
      paddingTop: theme.spacing(8),
      paddingBottom: theme.spacing(8)
    }
  }
}));

function LandingPage(props) {
  const classes = useStyles();
  const page = get(props, "data.page.item", null);

  if (!page) {
    return (
      <UnknownComponent>
        Page {page.system.codename} does not have any content!
      </UnknownComponent>
    );
  }

  return (
    <Layout {...props}>
      <Box className={classes.sections}>
        {get(page, "elements.sections.linkedItems", []).map((section, index) => {
          const contentType = upperFirst(camelCase(get(section, "system.type", null)));
          const Component = sections[contentType];

          if (process.env.NODE_ENV === "development" && !Component) {
            console.error(`Unknown section component for section content type: ${contentType}`);
            return (
              <UnknownComponent key={index} {...props}>
                <pre>{JSON.stringify(section, undefined, 2)}</pre>
              </UnknownComponent>
            );
          }

          return (
            <Component key={index} {...props} section={section} site={props} />
          );
        })
        }
      </Box>
    </Layout>
  );
}

export default LandingPage;