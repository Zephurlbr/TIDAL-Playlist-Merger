class LoggedInUser(FetchedUser):
    username: Optional[str] = None
    email: Optional[str] = None
    profile_metadata: Optional[JsonObj] = None

    def __init__(self, session: "Session", user_id: Optional[int]):
        super(LoggedInUser, self).__init__(session, user_id)
        assert self.id is not None, "User is not logged in"
        self.favorites = Favorites(session, self.id)

    def parse(self, json_obj: JsonObj) -> "LoggedInUser":
        super(LoggedInUser, self).parse(json_obj)
        self.username = json_obj["username"]
        self.email = json_obj["email"]
        self.profile_metadata = json_obj

        return copy(self)

    def playlists(self) -> List[Union["Playlist", "UserPlaylist"]]:
        """Get the (personal) playlists created by the user.

        :return: Returns a list of :class:`~tidalapi.playlist.Playlist` objects containing the playlists.
        """
        return cast(
            List[Union["Playlist", "UserPlaylist"]],
            self.request.map_request(
                "users/%s/playlists" % self.id, parse=self.playlist.parse_factory
            ),
        )

    def public_playlists(
        self, offset: int = 0, limit: int = 50
    ) -> List[Union["Playlist", "UserPlaylist"]]:
        """Get the (public) playlists created by the user.

        :param limit: The number of items you want returned.
        :param offset: The index of the first item you want included.
        :return: List of public playlists.
        """
        params = {"limit": limit, "offset": offset}
        endpoint = "user-playlists/%s/public" % self.id
        json_obj = self.request.request(
            "GET", endpoint, base_url=self.session.config.api_v2_location, params=params
        ).json()

        # The response contains both playlists and user details (followInfo, profile) but we will discard the latter.
        playlists = {"items": []}
        for index, item in enumerate(json_obj["items"]):
            if item["playlist"]:
                playlists["items"].append(item["playlist"])

        return cast(
            List[Union["Playlist", "UserPlaylist"]],
            self.request.map_json(playlists, parse=self.playlist.parse_factory),
        )

    def playlist_and_favorite_playlists(
        self, offset: int = 0, limit: int = 50
    ) -> List[Union["Playlist", "UserPlaylist"]]:
        """Get the playlists created by the user, and the playlists favorited by the
        user. This function is limited to 50 by TIDAL, requiring pagination.

        :return: Returns a list of :class:`~tidalapi.playlist.Playlist` objects containing the playlists.
        """
        params = {"limit": limit, "offset": offset}
        endpoint = "users/%s/playlistsAndFavoritePlaylists" % self.id
        json_obj = self.request.request("GET", endpoint, params=params).json()

        # This endpoint sorts them into favorited and created playlists, but we already do that when parsing them.
        for index, item in enumerate(json_obj["items"]):
            item["playlist"]["dateAdded"] = item["created"]
            json_obj["items"][index] = item["playlist"]

        return cast(
            List[Union["Playlist", "UserPlaylist"]],
            self.request.map_json(json_obj, parse=self.playlist.parse_factory),
        )

    def create_playlist(
        self, title: str, description: str, parent_id: str = "root"
    ) -> "UserPlaylist":
        """Create a playlist in the specified parent folder.

        :param title: Playlist title
        :param description: Playlist description
        :param parent_id: Parent folder ID. Default: 'root' playlist folder
        :return: Returns an object of :class:`~tidalapi.playlist.UserPlaylist` containing the newly created playlist
        """
        params = {"name": title, "description": description, "folderId": parent_id}
        endpoint = "my-collection/playlists/folders/create-playlist"

        json_obj = self.request.request(
            method="PUT",
            path=endpoint,
            base_url=self.session.config.api_v2_location,
            params=params,
        ).json()
        json = json_obj.get("data")
        if json and json.get("uuid"):
            playlist = self.session.playlist().parse(json)
            return playlist.factory()
        else:
            raise ObjectNotFound("Playlist not found after creation")

    def create_folder(self, title: str, parent_id: str = "root") -> "Folder":
        """Create folder in the specified parent folder.

        :param title: Folder title
        :param parent_id: Folder parent ID. Default: 'root' playlist folder
        :return: Returns an object of :class:`~tidalapi.playlist.Folder` containing the newly created object
        """
        params = {"name": title, "folderId": parent_id}
        endpoint = "my-collection/playlists/folders/create-folder"

        json_obj = self.request.request(
            method="PUT",
            path=endpoint,
            base_url=self.session.config.api_v2_location,
            params=params,
        ).json()
        if json_obj and json_obj.get("data"):
            return self.request.map_json(json_obj, parse=self.folder.parse)
        else:
            raise ObjectNotFound("Folder not found after creation")

