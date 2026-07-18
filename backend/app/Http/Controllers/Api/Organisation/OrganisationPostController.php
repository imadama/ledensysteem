<?php

namespace App\Http\Controllers\Api\Organisation;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organisation\StorePostRequest;
use App\Http\Requests\Organisation\UpdatePostRequest;
use App\Jobs\SendOrganisationPostNotification;
use App\Models\OrganisationPost;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

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

        // DELIVERY step 1: an org-admin creates a post (POST /api/organisation/posts).
        $post = OrganisationPost::create([
            'organisation_id' => $user->organisation_id,
            'created_by' => $user->id,
            'title' => $data['title'],
            'body' => $data['body'],
            'status' => $status,
            'published_at' => $status === 'published' ? now() : null,
        ]);

        // Only published posts notify members; a draft stays silent.
        if ($post->status === 'published') {
            $this->notifyMembers($post); // -> DELIVERY step 2
        }

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

        $newlyPublished = false;
        if (array_key_exists('status', $data) && $data['status'] !== null) {
            // When a draft becomes published for the first time, stamp published_at + notify.
            if ($data['status'] === 'published' && $post->published_at === null) {
                $post->published_at = now();
                $newlyPublished = true;
            }
            $post->status = $data['status'];
        }

        $post->save();

        if ($newlyPublished) {
            $this->notifyMembers($post);
        }

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
     * Best-effort push notification to members. Runs synchronously (no worker yet)
     * and never lets a push failure break post creation.
     */
    // DELIVERY step 2: hand the work to the notification job.
    // dispatchSync = run it right now (there is no queue worker running yet).
    // Str::limit trims the body to a short notification preview (120 chars).
    // The whole thing is wrapped in try/catch: a push failure must NEVER stop
    // the post from being created — creating the post is the important part.
    private function notifyMembers(OrganisationPost $post): void
    {
        try {
            SendOrganisationPostNotification::dispatchSync(
                $post->organisation_id,
                $post->id,
                $post->title,
                Str::limit($post->body, 120),
            ); // -> DELIVERY step 3 (the job's handle())
        } catch (Throwable $e) {
            Log::error('Post notification dispatch failed', ['error' => $e->getMessage()]);
        }
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
