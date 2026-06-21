<?php

namespace App\Http\Controllers\Api\Member;

use App\Http\Controllers\Controller;
use App\Models\OrganisationPost;
use App\Models\PostComment;
use App\Models\PostLike;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberPostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $posts = OrganisationPost::query()
            ->where('organisation_id', $user->organisation_id)
            ->where('status', 'published')
            ->withCount(['comments', 'likes'])
            ->withExists(['likes as liked_by_me' => fn ($q) => $q->where('user_id', $user->id)])
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate((int) $request->query('per_page', 15));

        return response()->json([
            'data' => collect($posts->items())->map(fn (OrganisationPost $p) => $this->transformSummary($p))->all(),
            'meta' => $this->meta($posts),
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $post = $this->findForMember($request, $id);
        $post->loadCount(['comments', 'likes']);
        $likedByMe = $post->likes()->where('user_id', $user->id)->exists();

        $comments = $post->comments()->with('user')->get()->map(fn (PostComment $c) => $this->transformComment($c));

        return response()->json([
            'data' => [
                'id' => $post->id,
                'title' => $post->title,
                'body' => $post->body,
                'published_at' => $post->published_at?->toIso8601String(),
                'comment_count' => (int) $post->comments_count,
                'like_count' => (int) $post->likes_count,
                'liked_by_me' => $likedByMe,
                'comments' => $comments->all(),
            ],
        ]);
    }

    public function comments(Request $request, int $id): JsonResponse
    {
        $post = $this->findForMember($request, $id);
        $comments = $post->comments()->with('user')->get()->map(fn (PostComment $c) => $this->transformComment($c));

        return response()->json(['data' => $comments->all()]);
    }

    public function storeComment(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $user = $request->user();
        $post = $this->findForMember($request, $id);

        $comment = $post->comments()->create([
            'user_id' => $user->id,
            'body' => $validated['body'],
        ]);

        $comment->load('user');

        return response()->json(['data' => $this->transformComment($comment)], 201);
    }

    public function like(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $post = $this->findForMember($request, $id);

        PostLike::query()->firstOrCreate([
            'organisation_post_id' => $post->id,
            'user_id' => $user->id,
        ]);

        return response()->json(['data' => ['liked_by_me' => true, 'like_count' => $post->likes()->count()]]);
    }

    public function unlike(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $post = $this->findForMember($request, $id);

        PostLike::query()
            ->where('organisation_post_id', $post->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['data' => ['liked_by_me' => false, 'like_count' => $post->likes()->count()]]);
    }

    private function findForMember(Request $request, int $id): OrganisationPost
    {
        return OrganisationPost::query()
            ->where('organisation_id', $request->user()->organisation_id)
            ->where('status', 'published')
            ->findOrFail($id);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformSummary(OrganisationPost $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'excerpt' => mb_strimwidth($post->body, 0, 140, '…'),
            'published_at' => $post->published_at?->toIso8601String(),
            'comment_count' => (int) ($post->comments_count ?? 0),
            'like_count' => (int) ($post->likes_count ?? 0),
            'liked_by_me' => (bool) ($post->liked_by_me ?? false),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformComment(PostComment $comment): array
    {
        $user = $comment->user;
        $name = $user ? trim(($user->first_name ?? '').' '.($user->last_name ?? '')) : '';

        return [
            'id' => $comment->id,
            'body' => $comment->body,
            'author' => $name !== '' ? $name : ($user->name ?? 'Lid'),
            'created_at' => $comment->created_at?->toIso8601String(),
        ];
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
