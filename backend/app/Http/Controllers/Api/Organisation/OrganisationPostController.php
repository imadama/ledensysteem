<?php

namespace App\Http\Controllers\Api\Organisation;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organisation\StorePostRequest;
use App\Http\Requests\Organisation\UpdatePostRequest;
use App\Models\OrganisationPost;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganisationPostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $posts = OrganisationPost::forCurrentOrganisation()
            ->withCount(['comments', 'likes'])
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return response()->json([
            'data' => collect($posts->items())->map(fn (OrganisationPost $p) => $this->transform($p))->all(),
            'meta' => $this->meta($posts),
        ]);
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();
        $status = $data['status'] ?? 'published';

        $post = OrganisationPost::create([
            'organisation_id' => $user->organisation_id,
            'created_by' => $user->id,
            'title' => $data['title'],
            'body' => $data['body'],
            'status' => $status,
            'published_at' => $status === 'published' ? now() : null,
        ]);

        return response()->json([
            'data' => $this->transform($post->loadCount(['comments', 'likes']), includeBody: true),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $post = OrganisationPost::forCurrentOrganisation()
            ->withCount(['comments', 'likes'])
            ->findOrFail($id);

        return response()->json(['data' => $this->transform($post, includeBody: true)]);
    }

    public function update(UpdatePostRequest $request, int $id): JsonResponse
    {
        $post = OrganisationPost::forCurrentOrganisation()->findOrFail($id);
        $data = $request->validated();

        $post->title = $data['title'];
        $post->body = $data['body'];

        if (array_key_exists('status', $data) && $data['status'] !== null) {
            // When a draft becomes published for the first time, stamp published_at.
            if ($data['status'] === 'published' && $post->published_at === null) {
                $post->published_at = now();
            }
            $post->status = $data['status'];
        }

        $post->save();

        return response()->json([
            'data' => $this->transform($post->loadCount(['comments', 'likes']), includeBody: true),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $post = OrganisationPost::forCurrentOrganisation()->findOrFail($id);
        $post->delete();

        return response()->json(['message' => 'Bericht verwijderd.']);
    }

    public function comments(Request $request, int $id): JsonResponse
    {
        $post = OrganisationPost::forCurrentOrganisation()->findOrFail($id);
        $comments = $post->comments()->with('user')->get();

        return response()->json([
            'data' => $comments->map(fn ($c) => [
                'id' => $c->id,
                'body' => $c->body,
                'author' => $this->authorName($c->user),
                'created_at' => $c->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    public function likes(Request $request, int $id): JsonResponse
    {
        $post = OrganisationPost::forCurrentOrganisation()->findOrFail($id);
        $likes = $post->likes()->with('user')->get();

        return response()->json([
            'data' => $likes->map(fn ($like) => [
                'id' => $like->id,
                'author' => $this->authorName($like->user),
                'created_at' => $like->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(OrganisationPost $post, bool $includeBody = false): array
    {
        $data = [
            'id' => $post->id,
            'title' => $post->title,
            'status' => $post->status,
            'published_at' => $post->published_at?->toIso8601String(),
            'created_at' => $post->created_at?->toIso8601String(),
            'comment_count' => (int) ($post->comments_count ?? 0),
            'like_count' => (int) ($post->likes_count ?? 0),
        ];

        if ($includeBody) {
            $data['body'] = $post->body;
        }

        return $data;
    }

    private function authorName(?\App\Models\User $user): string
    {
        if (! $user) {
            return 'Onbekend';
        }

        $name = trim(($user->first_name ?? '').' '.($user->last_name ?? ''));

        return $name !== '' ? $name : ($user->name ?? $user->email);
    }

    /**
     * @return array<string, int>
     */
    private function meta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ];
    }
}
