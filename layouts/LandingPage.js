import get from "lodash.get";
import { Box, makeStyles } from "@material-ui/core";
import Layout from "../components/Layout";
import {
  ContactSection,
  ContentSection,
  CtaSection,
  FaqSection,
  FeaturesSection,
  HeroSection,
  ListingSection,
  PricingSection,
  ReviewsSection
} from "../components/sections";

const useStyles = makeStyles((theme) => ({
  sections: {
    "& > section:first-child": {
      paddingTop: theme.spacing(8),
      paddingBottom: theme.spacing(8)
    }
  }
}));

function getSectionComponent(contentType) {
  switch (contentType) {
    case "contact_section":
      return ContactSection;
    case "content_section":
      return ContentSection;
    case "cta_section":
      return CtaSection;
    case "faq_section":
      return FaqSection;
    case "features_section":
      return FeaturesSection;
    case "hero_section":
      return HeroSection;
    case "listing_section":
      return ListingSection;
    case "pricing_section":
      return PricingSection;
    case "reviews_section":
      return ReviewsSection;
    default:
      return null;
  }
}

function LandingPage(props) {
  const classes = useStyles();
  const page = get(props, "page", null);

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
        {get(page, "sections.value", []).map((section, index) => {
          const contentType = get(section, "system.type", null);
          const Component = getSectionComponent(contentType)

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