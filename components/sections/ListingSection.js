import React from "react";
import get from "lodash.get";
import { Card, CardContent, Container, Grid, makeStyles, Typography } from "@material-ui/core";
import RichText from "../RichText";
import Post from "../thumbnails/Post";
import { UnknownComponent } from "..";

const useStyles = makeStyles((theme) => ({
  section: {
    padding: theme.spacing(2)
  },
  intro: {
    textAlign: "center"
  },
  itemCard: {
    height: "100%"
  }
}));

function getListingThumbnailComponent(contentType) {
  switch (contentType) {
    case "post":
      return Post;
    default:
      return null;
  }
}

function ListingSection(props) {
  const section = get(props, "section", null);
  const relatedItems = get(props, `related[${section.system.codename}]`, []);
  const classes = useStyles();

  return (
    <section id={get(section, "system.codename", null)} className={classes.section}>
      <Container>
        <div className={classes.intro}>
          {get(section, "title.value", null) && (
            <Typography variant="h2">{get(section, "title.value", null)}</Typography>
          )}
          {get(section, "subtitle.value", null) && (
            <Typography variant="subtitle1">
              <RichText
                {...props}
                richTextElement={get(section, "subtitle", null)}
              />
            </Typography>
          )}
        </div>

        {relatedItems.length > 0 && (
          <Grid container spacing={2} alignItems="stretch">
            {relatedItems.map((item, item_idx) => {
              const contentType = get(item, "system.type", null);
              const ThumbnailLayout = getListingThumbnailComponent(contentType);

              if (process.env.NODE_ENV === "development" && !ThumbnailLayout) {
                console.error(`Unknown section component for section content type: ${contentType}`);
                return (
                  <Grid item md={4} sm={12} key={item_idx}>
                    <UnknownComponent key={item_idx} {...this.props}>
                      <pre>{JSON.stringify(item, undefined, 2)}</pre>
                    </UnknownComponent>
                  </Grid>

                );
              }

              return (
                <Grid item md={4} sm={12} key={item_idx}>
                  <Card className={classes.itemCard} >
                    <CardContent>
                      <ThumbnailLayout key={item_idx} {...props} item={item} columnCount={3} />
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </section>
  );
}

export default ListingSection;
