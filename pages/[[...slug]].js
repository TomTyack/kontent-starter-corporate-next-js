import React from "react";

import { getSitemapMappings, getPageStaticPropsForPath } from "../lib/api";
import { useRouter } from "next/router";
import Error from "next/error";
import { LandingPage, SimplePage, ListingPage, Post } from "../layouts";
import { UnknownComponent } from "../components";
import get from "lodash.get"

function getPageLayoutComponent(contentType) {
    switch (contentType) {
        case "landing_page":
            return LandingPage;
        case "simple_page":
            return SimplePage;
        case "listing_page":
            return ListingPage;
        case "post":
            return Post;
        default:
            return null;
    }
}

function Page(props) {
    console.log(new Date(), "Page [[...slug]].js getStaticProps, params is rendering the page: ", props.params);

    const router = useRouter();
    // If the page is not yet generated, this will be displayed
    // initially until getStaticProps() finishes running
    if (router.isFallback) {
        return (
            <div>Loading...</div>
        );
    }

    // every page can have different layout, pick the layout based on content type
    const contentType = get(props, "page.system.type") === "post"
        ? "post"
        : get(props, "page.system.type");

    const PageLayout = getPageLayoutComponent(contentType);

    if (process.env.NODE_ENV === "development" && !PageLayout) {
        console.error(`Unknown Layout component for page content type: ${contentType}`);
        return (
            <UnknownComponent {...props} useLayout={true}>
                <pre>{JSON.stringify(props, undefined, 2)}</pre>
            </UnknownComponent>
        );
    }

    return <PageLayout {...props} />;
}

export async function getStaticPaths(ctx) {
    console.log(new Date(), "Page [[...slug]].js getStaticPaths", ctx);
    const paths = await getSitemapMappings();

    // https://nextjs.org/docs/messages/ssg-fallback-true-export
    const fallback = process.env.STATIC_EXPORT ? false : true;

    return {
        paths,
        // Set to false when exporting to static site
        fallback
    };
}

export async function getStaticProps({ params, preview = false }) {
    console.log(new Date(), "Page [[...slug]].js getStaticProps, params: ", params);
    const props = await getPageStaticPropsForPath(params, preview);
    console.log(new Date(), "Page [[...slug]].js getStaticProps, params has props: ", params);

    if (props === undefined) {
        return (
            <Error statusCode={404} />
        );
    }

    return {
        props:
        {
            ...props,
            params,
            preview,
        },
        // Next.js will attempt to re-generate the page:
        // https://nextjs.org/docs/basic-features/data-fetching#incremental-static-regeneration
        // - When a request comes in
        // - At most once every 5 second
        revalidate: 5, // In seconds
    };
}

export default Page;
