# Audit Checklist

## Phase 1: Complete Codebase Audit
- [ ] Find undefined variables
- [ ] Find unhandled promise rejections
- [ ] Check missing React dependencies
- [ ] Check incorrect state updates / race conditions
- [ ] Check duplicate Socket.IO listeners
- [ ] Check missing cleanup
- [ ] Check incorrect API URLs
- [ ] Check broken loading/error states
- [ ] Check mobile autoplay
- [ ] Check authentication inconsistencies

## Phase 2: Authentication, Friends & Chat
- [ ] Register and log in
- [ ] Persist session
- [ ] Send/receive friend requests
- [ ] Private chat logic
- [ ] Protected routes

## Phase 3: Music Upload, Library & Playback
- [ ] Cloudinary uploads
- [ ] Metadata in MongoDB
- [ ] Public/Private visibility rules
- [ ] Solo listening
- [ ] Shared listening (all combinations)
- [ ] Mobile browser audio

## Phase 4: YouTube Player
- [ ] Init only once
- [ ] Handle invalid URLs
- [ ] Minimize/restore/circular player
- [ ] Saved songs
- [ ] Duplicate player bugs

## Phase 5: Voice/Video Calls
- [ ] Audio attach to element
- [ ] Timer logic
- [ ] Mute/unmute
- [ ] Camera permissions
- [ ] WebRTC ICE queueing and signaling
- [ ] TURN secure usage

## Phase 6: History & Recommendations
- [ ] Logging correct user/song
- [ ] Duplicate entries
- [ ] Private isolation

## Phase 7: Chat Music Library
- [ ] Conversation scope
- [ ] Delete permissions
- [ ] Solo vs Shared separation

## Phase 8: Backend & API Security
- [ ] Auth & Authorization middleware
- [ ] Rate limiting
- [ ] Database indexes
- [ ] CORS
- [ ] HTTP Range / 206 Partial Content proxying

## Phase 9: Responsive UI & Browser Testing
- [ ] Viewports and CSS
- [ ] Missing icons / overlapping modals

## Phase 10: Automated Tests
- [ ] Test suites passing
- [ ] Build succeeding
