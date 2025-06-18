export const getProjectIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("projectId");
};
