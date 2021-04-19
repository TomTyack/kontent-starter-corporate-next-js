import { makeStyles } from "@material-ui/core/styles";
import { Box, Container, Divider, Grid } from "@material-ui/core";
import get from "lodash.get";
import { RichText, UnknownComponent } from "../components";
import { ContentSection, Form, Menu } from "./footerSections";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    background: theme.palette.grey[200],
    marginTop: theme.spacing(2),
    paddingBottom: theme.mixins.toolbar.minHeight
  },
  copyright: {
    margin: 0,
    padding: theme.spacing(1),
    textAlign: "center"
  }
}));

function getFooterSectionComponent(contentType) {
  switch (contentType) {
    case "content_section":
      return ContentSection;
    case "form":
      return Form;
    case "menu":
      return Menu;
    default:
      return null;
  }
}

function Footer(props) {
  const footerSections = get(props, "data.config.footer_sections.value", []);
  const classes = useStyles();

  return (
    <Box className={classes.root}>
      <Container>
        <footer>
          {footerSections.length > 0 && (
            <Grid container spacing={2} >
              {footerSections.map((section, index) => {
                const contentType = get(section, "system.type", null);
                const Component = getFooterSectionComponent(contentType);

                if (process.env.NODE_ENV === "development" && !Component) {
                  console.error(`Unknown section component for section content type: ${contentType}`);
                  return (
                    <Grid item xs={12} sm={6} md={3} key={index} >
                      <UnknownComponent {...props}>
                        <pre>{JSON.stringify(section.system, undefined, 2)}</pre>
                      </UnknownComponent>
                    </Grid>
                  );
                }

                return (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Component  {...props} section={section} />
                  </Grid>
                );
              })
              }
            </Grid>
          )}

          {get(props, "data.config.copyright.value", null) && (
            <div className={classes.copyright}>
              <Divider />
              <RichText
                {...props}
                richTextElement={get(props, "data.config.copyright")}
              />
            </div>
          )}
        </footer>
      </Container>
    </Box>
  );
}

export default Footer;
