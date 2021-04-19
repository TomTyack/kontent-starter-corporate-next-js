import get from "lodash.get";
import { Image, Layout, RichText, UnknownComponent } from "../components";
import { Container, makeStyles, Typography, useTheme } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  root: {
    paddingTop: theme.spacing(4)
  }
}));

function Post(props) {
  const classes = useStyles();
  const post = get(props, "page", null);

  if (!post) {
    return (
      <UnknownComponent>
        Page {post.system.codename} does not have any content!
      </UnknownComponent>
    );
  }

  const theme = useTheme();
  const imageSizes = `${theme.breakpoints.values.md}px`;

  return (
    <Layout {...props}>
      <Container className={classes.root} maxWidth="md">
        {get(post, "title.value", null) && (
          <Typography variant="h1">{get(post, "title.value", null)}</Typography>
        )}
        {get(post, "subtitle.value", null) && (
          <Typography variant="subtitle1" >
            <RichText
              {...props}
              richTextElement={get(post, "subtitle", null)}
            />
          </Typography>
        )}

        {get(post, "image.value[0]", null) && (
          <div>
            <Image
              sizes={imageSizes}
              asset={get(post, "image.value[0]", null)}
              alt={get(post, "image.value[0].description") || get(post, "image.value[0].name", null)} />
          </div>
        )}
        <Typography component="div">
          <RichText
            {...props}
            richTextElement={get(post, "content", null)}
          />
        </Typography>

        <footer>
          <time>{get(post, "publishing_date.value", null) && new Date(get(post, "publishing_date.value", null)).toDateString()}</time>
          {get(post, "author.value[0]", null) &&
            (", by " + get(post, "author.value[0].first_name.value", null) + " " + get(post, "author.value[0].last_name.value", null))}
        </footer>
      </Container>
    </Layout>
  );
}

export default Post;