# Asset prompts (Higgsfield)

Every final asset gets an entry here: file, model, job, prompt. Assets are stored locally in
`public/assets/` (WebP) and `public/icons/` (PNG); nothing is hot-linked.

## How they were made

- The Higgsfield trial's free generations only work in Claude chat, so the set was generated
  from Claude Code on credits with **Z Image** (`z_image`, 0.15 credits per image, 1:1, 2048px).
- Each image was inspected for exercise form and anatomy; failures were regenerated at most
  twice with a more explicit prompt. `scripts/process-assets.py` resizes and converts the
  approved PNGs (exercises 768px, mascot 640px, avatars 320px WebP; icons 180/192/512 PNG).

## Style checkpoint

Three tests, 1:1. The user picked **Style B — soft 3D clay**.

| Test | Model | Job | Verdict |
|---|---|---|---|
| Squat, Style B clay | nano_banana_2 | `42e047c6-cddd-4af3-b892-fdbee98e4525` | 3/4 view, extra mats (made in chat) |
| Squat, Style A flat vector | z_image | `bf5e1f57-787f-4e06-a97f-505c7f556402` | Rejected: sitting on a bench, mismatched shoes |
| Mascot, Style A flat vector | z_image | `d5226a87-f4b2-45f6-aa40-9de08e4c02be` | OK, off-centre |
| Squat, Style B clay | z_image | `c60fe036-2f98-40ec-9429-e86f6426f796` | **Chosen**, also used as `squat.webp` |

## Shared style suffix (Style B)

Exercise prompts end with:

> Anatomically correct, two arms, two legs, five fingers per hand. Soft 3D clay render, smooth
> matte materials, rounded stylized proportions, studio lighting with a bright lime-green rim
> light, plain near-black charcoal background, athlete with short dark hair in slate grey t-shirt
> and shorts with lime-green accents, [lime-green weight plates | dumbbells | machine], full body
> visible, centered, generous padding. No text, no logos, no watermark.

Avatars and the mascot use the same clay/lighting/background wording without the athlete line.

## Final assets

Prompts below are the subject part; the suffix above follows each exercise prompt.

### Exercises (`public/assets/exercises/`)

| File | Job (final) | Attempts | Subject prompt |
|---|---|---|---|
| `squat.webp` | `c60fe036-…6f796` | 1 | Side view of an athletic man performing a barbell back squat at the bottom position: barbell resting across the upper back, both hands gripping the bar, thighs parallel to the floor, knees over toes, flat back, chest up, feet flat on the floor. |
| `bench-press.webp` | `c124e72f-ca71-4536-b820-3c5b233a94e6` | 3 (bar over face twice) | Strict side profile view, camera at bench height, of an athletic man doing a bench press lying flat on a horizontal bench: the barbell is lowered and touching the middle of his chest, forearms vertical, elbows below the bench level, head resting on the bench at the left, feet flat on the floor at the right. The bar is over the chest, far from the face. *(result shows lockout over the chest)* |
| `overhead-press.webp` | `fd164d00-1ac0-480a-987e-c9b97ed41934` | 1 | Three-quarter front view of an athletic man doing a standing barbell overhead press at lockout: barbell pressed straight overhead with arms fully extended, bar above the middle of the feet, head slightly forward under the bar, core braced, legs straight, feet flat hip-width. |
| `barbell-row.webp` | `5343ea0d-2205-4027-aa77-305df148472f` | 2 (rounded back) | Pure side profile view of an athletic man doing a bent-over barbell row: perfectly straight flat back in one line from hips to head, torso leaning forward at 45 degrees, knees slightly bent, elbows bent and pulled back behind the torso, barbell pulled up touching his belly, neutral neck. *(result shows the hang position with a flat back)* |
| `pull-up.webp` | `60359bfc-a507-4fe2-9668-825f265892c6` | 2 (feet on floor) | Front view of an athletic man at the top of a pull-up, his whole body hanging in the air high above the floor: both hands gripping a high horizontal bar, elbows bent and pointing down, his chin above the bar, feet dangling far off the ground with knees slightly bent and ankles crossed, clear empty space between his feet and the floor. *(result shows a dead hang)* |
| `lat-pulldown.webp` | `3993fd54-c05d-4cd0-8801-bda7a12662f1` | 1 | Three-quarter view of an athletic man using a seated lat pulldown cable machine: sitting with thighs under the knee pads, torso slightly leaning back, pulling a wide straight bar down to his upper chest with both hands, elbows pointing down. *(result shows the start position)* |
| `romanian-deadlift.webp` | `fbfe4fa0-99cd-4a51-b577-99fc17366d33` | 1 | Side view of an athletic man doing a barbell Romanian deadlift: standing, hips pushed far back, knees only slightly bent, flat neutral back, torso tilted forward, arms straight holding a barbell that hangs at mid-shin height close to the legs, feet flat. |
| `lateral-raise.webp` | `b202b8e2-e3d9-45a6-a760-e5744ae21190` | 2 (pressing overhead) | Front view of an athletic man doing a dumbbell lateral raise: both arms stretched straight out horizontally to the sides like a letter T, hands exactly at shoulder height, one dumbbell in each hand, palms facing the floor, elbows slightly soft, standing tall with feet flat. His hands are not above his head. |

The last four were made with **Nano Banana** (`nano_banana`, 1 credit each, user-approved) after
z_image kept drawing arms overhead and its queue failed every resubmission (failed jobs were
refunded). Each used the chosen squat (`c60fe036-…`) as an `image_references` style reference,
and each prompt starts with "Same character, same soft 3D clay style, lighting and plain
near-black charcoal background as the reference image[, but no barbell]."

| File | Job (final) | Attempts | Subject prompt |
|---|---|---|---|
| `deadlift.webp` | `b63129ad-4e11-41fe-9020-acfb8b10cae0` | z_image 1 rejected (rounded back) + nano_banana 1 | Pure side profile view of the man at the start of a conventional barbell deadlift: barbell with lime-green plates resting on the floor over mid-foot, bar touching his shins, hips hinged back and higher than the knees, perfectly flat neutral back in one straight line from hips to head, chest up, arms straight and vertical gripping the bar just outside the knees, feet flat. |
| `dumbbell-curl.webp` | `e69e76c5-3bc4-4f12-be7e-318abd7623bc` | z_image 2 rejected (pressing overhead) + nano_banana 1 | Three-quarter front view of the man standing tall doing a dumbbell biceps curl: upper arms hanging vertically with elbows pinned to his sides, forearms curled up so each lime-green dumbbell is in front of his shoulders, palms facing up toward him, hands below shoulder height, feet flat hip-width. |
| `triceps-pushdown.webp` | `437864d4-fbc6-4061-9ae2-d31004f5a9e1` | z_image 1 rejected (arms overhead) + nano_banana 1 | Side view of the man doing a cable triceps pushdown at a slate grey cable machine with lime-green details: standing upright facing the machine, upper arms pinned against his sides, elbows at his waist, arms fully extended straight down, both hands pressing a short straight bar down to the front of his thighs, the cable running from the bar up to the high pulley. |
| `leg-press.webp` | `9112338e-471f-4279-8a17-65771d3de02e` | z_image 1 rejected (seated, feet on floor) + nano_banana 1 | Side view of the man on a 45-degree incline sled leg press machine (slate grey with lime-green weight plates): reclined on the angled seat, back flat on the backrest, both feet flat on the large footplate that is above and in front of his hips, knees bent about 90 degrees, hands on the side handles, feet not touching the floor. |

### Mascot, avatars, icon

| File | Job | Prompt |
|---|---|---|
| `assets/mascot.webp` | `a5a34a94-1fb1-40c8-b05d-6c6144393224` | Friendly gym coach mascot: a stocky confident cartoon gorilla wearing a bright lime-green sweatband on the forehead and a lime-green tank top, a silver whistle hanging on a cord around the neck, arms crossed, warm encouraging smile, full body standing, facing the viewer. + clay suffix |
| `assets/avatars/avatar-1.webp` | `8738ea79-8f7f-4716-bfdd-c7c07f4f95c3` | Head and shoulders portrait avatar of a friendly young woman athlete with a high ponytail and a bright lime-green headband, slate grey sports top, confident smile, facing the viewer, face centered in the frame for a circular crop. + clay suffix |
| `assets/avatars/avatar-2.webp` | `523c46ee-0e10-4ece-901f-a981422ebf72` | …friendly bearded man athlete with short dark hair wearing a bright lime-green hoodie, relaxed grin… |
| `assets/avatars/avatar-3.webp` | `8fe28f33-2ce3-4bb0-911f-0bb768e8442d` | …cheerful fit older man with short grey hair and a grey stubble, slate grey t-shirt with a lime-green collar, warm smile… |
| `assets/avatars/avatar-4.webp` | `b4d64fb8-b5d1-4e47-af40-8fe99f65d95e` | …energetic young woman athlete with dark skin and curly black hair, bright lime-green tank top, big smile… |
| `icons/*`, `favicon.ico` | `a913467e-eea1-49a4-be18-21c3f7e685a2` | Mobile app icon: a single chunky dumbbell with bright lime-green round weight plates and a silver handle, tilted diagonally at 30 degrees, centered, occupying about 60 percent of the frame, bold simple silhouette readable at small sizes. Soft 3D clay render, flat plain near-black charcoal background filling the whole square edge to edge, no border. No text. |

### Mascot cut-out (2026-11-14, no credits)

The mascot was turned into a transparent-background character so it reads as a
character, not a picture in a box. Done locally with `scripts/cutout-mascot.py`
(numpy + Pillow: quadratic background model, low local texture + low saturation
= background, flood fill from the border, enclosed floor patch between the legs
removed, mask eroded and feathered). Output trimmed to 451x640 RGBA WebP.
`process-assets.py` would re-create the boxed version from the raw PNG, so
re-run the cut-out after it if the mascot is ever regenerated.
